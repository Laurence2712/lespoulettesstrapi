import { Resend } from 'resend';

function sendAdminNotification(result: any, items: any[]) {
  const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL || 'laurencepirard27@gmail.com';
  if (!apiKey) return;

  const ref = `LP-${String(result.id).padStart(4, '0')}`;
  const livraison = result.mode_livraison === 'retrait_gratuit' ? 'Retrait gratuit' : 'Livraison à domicile';
  const adresse = result.mode_livraison === 'retrait_gratuit'
    ? 'Retrait gratuit'
    : [result.rue, result.code_postal, result.ville, result.pays].filter(Boolean).join(', ');

  const articlesHtml = items.map((a: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${a.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">×${a.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${(a.prix * a.quantity).toFixed(2)} €</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;color:#222">
      <div style="background:#FACC15;padding:20px 28px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">🛍️ Nouvelle commande — Les Poulettes</h2>
        <p style="margin:4px 0 0;font-size:14px;opacity:.7">Réf : <strong>${ref}</strong></p>
      </div>
      <div style="background:#fff;padding:24px 28px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:4px 0;color:#666;width:120px">👤 Client</td><td><strong>${result.Nom}</strong></td></tr>
          <tr><td style="padding:4px 0;color:#666">📞 Téléphone</td><td>${result.Telephone}</td></tr>
          <tr><td style="padding:4px 0;color:#666">📧 Email</td><td>${result.Email}</td></tr>
          <tr><td style="padding:4px 0;color:#666">🚚 Livraison</td><td>${livraison}</td></tr>
          <tr><td style="padding:4px 0;color:#666">📍 Adresse</td><td>${adresse}</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:6px;overflow:hidden">
          <thead>
            <tr style="background:#f0f0f0">
              <th style="padding:8px 12px;text-align:left;font-size:13px">Article</th>
              <th style="padding:8px 12px;text-align:center;font-size:13px">Qté</th>
              <th style="padding:8px 12px;text-align:right;font-size:13px">Total</th>
            </tr>
          </thead>
          <tbody>${articlesHtml}</tbody>
        </table>

        <div style="text-align:right;margin-top:16px;font-size:18px;font-weight:bold">
          Total TTC : ${result.total ?? '?'} €
        </div>

        <div style="margin-top:20px;text-align:center">
          <a href="https://lespoulettesstrapi.onrender.com/admin/content-manager/collection-types/api::commande.commande"
            style="background:#FACC15;color:#000;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            Voir dans l'admin →
          </a>
        </div>
      </div>
    </div>`;

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || 'Les Poulettes <onboarding@resend.dev>';

  resend.emails.send({
    from,
    to: adminEmail,
    subject: `🛍️ Nouvelle commande ${ref} — ${result.Nom}`,
    html,
  }).catch((err: any) =>
    console.error('❌ Admin notification email error:', err?.message)
  );
}

export default {
  async afterCreate(event: any) {
    const { result } = event;

    try {
      // Décrémenter le stock des déclinaisons
      let items: any[] = [];
      try {
        items = typeof result.articles === 'string' ? JSON.parse(result.articles) : (result.articles || []);
      } catch {
        items = [];
      }

      for (const item of items) {
        if (item.categorieId && item.declinaisonId) {
          const categorie = await (strapi as any).entityService.findOne(
            'api::realisation.realisation',
            item.categorieId,
            { populate: ['Declinaison'] }
          ) as any;

          if (categorie && categorie.Declinaison) {
            const declinaisonIndex = categorie.Declinaison.findIndex(
              (d: any) => d.id === item.declinaisonId
            );

            if (declinaisonIndex !== -1) {
              const declinaison = categorie.Declinaison[declinaisonIndex];
              const newStock = Math.max(0, declinaison.Stock - item.quantity);

              categorie.Declinaison[declinaisonIndex].Stock = newStock;

              await (strapi as any).entityService.update(
                'api::realisation.realisation',
                item.categorieId,
                {
                  data: {
                    Declinaison: categorie.Declinaison
                  }
                }
              );

              console.log(`✅ Stock mis à jour : Catégorie ${item.categorieId}, Déclinaison ${item.declinaisonId}, Nouveau stock : ${newStock}`);
            }
          }
        }
      }

      // Notification admin par email (fire & forget)
      sendAdminNotification(result, items);

    } catch (error) {
      console.error('❌ Erreur lors du traitement de la commande :', error);
    }
  },

  async afterUpdate(event: any) {
    const { result, params } = event;

    // Email uniquement quand le statut passe à "payé"
    if (result.statut !== 'payé' || params.data.statut !== 'payé') {
      return;
    }

    if (result.email_sent) {
      console.log(`⚠️ Email déjà envoyé pour la commande #${result.id}`);
      return;
    }

    try {
      let items: any[] = [];
      try {
        items = typeof result.articles === 'string' ? JSON.parse(result.articles) : (result.articles || []);
      } catch {
        items = [];
      }

      const itemsHtml = items.map((item: any) => `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">${item.title}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${item.prix} €</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${(item.prix * item.quantity).toFixed(2)} €</td>
        </tr>
      `).join('');

      const isCarte = result.methode_paiement === 'carte';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #FACC15; padding: 30px; text-align: center;">
            <h1 style="color: #000; margin: 0;">Commande confirmée !</h1>
          </div>

          <div style="padding: 30px; background-color: #fff;">
            <p style="font-size: 16px;">Bonjour <strong>${result.Nom}</strong>,</p>

            <p>Merci pour votre commande ! Voici le récapitulatif :</p>

            <h2 style="color: #FACC15;">Commande #${result.id}</h2>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Article</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantité</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Prix unitaire</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="text-align: right; font-size: 20px; font-weight: bold; margin-top: 20px;">
              Total : ${result.total} €
            </div>

            ${isCarte ? `
            <div style="background-color: #D1FAE5; padding: 20px; margin: 30px 0; border-radius: 8px;">
              <h3 style="color: #000; margin-top: 0;">✅ Paiement par carte confirmé</h3>
              <p style="margin-bottom: 0;">Votre paiement par carte a bien été reçu. Merci !</p>
            </div>
            ` : `
            <div style="background-color: #FEF3C7; padding: 20px; margin: 30px 0; border-radius: 8px;">
              <h3 style="color: #000; margin-top: 0;">🏦 Paiement par virement</h3>
              <p>Merci d'effectuer votre virement en précisant votre nom et le numéro de commande.</p>
              <p style="margin-bottom: 0;">Vous recevrez une confirmation dès réception du paiement.</p>
            </div>
            `}

            <h3>📦 ${result.mode_livraison === 'retrait_gratuit' ? 'Retrait gratuit' : 'Adresse de livraison'}</h3>
            ${result.mode_livraison === 'retrait_gratuit'
              ? '<p>Vous serez contacté(e) pour convenir d\'un rendez-vous de retrait.</p>'
              : `<p>${[result.rue, result.adresse, result.code_postal, result.ville, result.pays].filter(Boolean).join('<br>')}</p>`
            }

            ${result.notes ? `
              <h3>📝 Notes</h3>
              <p>${result.notes}</p>
            ` : ''}

            <p style="margin-top: 30px;">À très bientôt !</p>
            <p><strong>Les Poulettes</strong></p>
          </div>
        </div>
      `;

      const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.error('❌ EMAIL_API_KEY ou RESEND_API_KEY manquant — email non envoyé');
        return;
      }

      const resend = new Resend(apiKey);
      const fromAddress = process.env.EMAIL_FROM || 'Les Poulettes <onboarding@resend.dev>';

      const { error } = await resend.emails.send({
        from: fromAddress,
        to: result.Email,
        replyTo: 'laurencepirard27@gmail.com',
        subject: `Confirmation de commande #${result.id} - Les Poulettes`,
        html: emailHtml,
      });

      if (error) {
        console.error('❌ Erreur Resend:', error);
      } else {
        // Use Document API (Strapi 5) — entityService is deprecated
        await (strapi as any).documents('api::commande.commande').update({
          documentId: result.documentId,
          data: { email_sent: true } as any,
        });
        console.log(`✅ Email envoyé à ${result.Email} pour la commande #${result.id} (${result.documentId})`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email :', error);
    }
  },
};
