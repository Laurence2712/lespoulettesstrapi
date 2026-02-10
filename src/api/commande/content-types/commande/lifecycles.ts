export default {
  async afterCreate(event: any) {
    const { result } = event;
    
    try {
      if (!result.email_sent) {
        const emailService = strapi.plugins['email'].services.email;
        
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
              
              <div style="background-color: #FEF3C7; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #000; margin-top: 0;">💳 Paiement Mobile Money</h3>
                <p><strong>Contactez-nous au +229 0162007580</strong> pour recevoir le QR Code</p>
                <p>Scannez le QR Code avec votre app mobile (MTN, Moov, Orange)</p>
                <p style="margin-bottom: 0;">Merci d'envoyer une capture du paiement par WhatsApp.</p>
              </div>
              
              <h3>📦 Adresse de livraison</h3>
              <p>${result.adresse}</p>
              
              ${result.notes ? `
                <h3>📝 Notes</h3>
                <p>${result.notes}</p>
              ` : ''}
              
              <p style="margin-top: 30px;">À très bientôt !</p>
              <p><strong>Les Poulettes</strong></p>
            </div>
          </div>
        `;

        await emailService.send({
          to: result.Email,
          from: process.env.EMAIL_FROM || 'laurencepirard27@gmail.com',
          replyTo: 'laurencepirard27@gmail.com',
          subject: `Confirmation de commande #${result.id} - Les Poulettes`,
          html: emailHtml,
        });

        await strapi.entityService.update('api::commande.commande', result.id, {
          data: { email_sent: true },
        });

        console.log(`✅ Email envoyé à ${result.Email}`);
      }

      // Décrémenter le stock des déclinaisons
      let items: any[] = [];
      try {
        items = typeof result.articles === 'string' ? JSON.parse(result.articles) : (result.articles || []);
      } catch {
        items = [];
      }

      for (const item of items) {
        if (item.categorieId && item.declinaisonId) {
          const categorie = await strapi.entityService.findOne(
            'api::realisation.realisation',
            item.categorieId,
            { populate: ['Declinaison'] }
          );

          if (categorie && categorie.Declinaison) {
            const declinaisonIndex = categorie.Declinaison.findIndex(
              (d: any) => d.id === item.declinaisonId
            );

            if (declinaisonIndex !== -1) {
              const declinaison = categorie.Declinaison[declinaisonIndex];
              const newStock = Math.max(0, declinaison.Stock - item.quantity);

              categorie.Declinaison[declinaisonIndex].Stock = newStock;

              await strapi.entityService.update(
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

    } catch (error) {
      console.error('❌ Erreur lors du traitement de la commande :', error);
    }
  },
};
