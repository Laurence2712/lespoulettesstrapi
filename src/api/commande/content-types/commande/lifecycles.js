'use strict';

const { Resend } = require('resend');

module.exports = {
  async afterCreate(event) {
    const { result } = event;

    console.log('🔔 Lifecycle hook déclenché pour commande:', result.id);
    console.log('📧 Email destinataire:', result.Email);

    // ✅ Vérifier si l'email a déjà été envoyé
    if (result.email_sent) {
      console.log('⚠️ Email déjà envoyé pour cette commande, skip.');
      return;
    }

    try {
      // Parser les articles
      const articles = typeof result.articles === 'string'
        ? JSON.parse(result.articles)
        : (result.articles || []);

      // Générer le HTML des articles
      const articlesHTML = articles.map(item => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: left;">${item.title}</td>
          <td style="padding: 12px; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right;">${item.prix} EUROS</td>
          <td style="padding: 12px; text-align: right; font-weight: bold;">${(item.prix * item.quantity).toFixed(2)} EUROS</td>
        </tr>
      `).join('');

      // Utiliser l'API Resend
      const resend = new Resend(process.env.EMAIL_API_KEY);

      const { data, error } = await resend.emails.send({
        from: 'Les Poulettes <onboarding@resend.dev>',
        to: [result.Email],
        replyTo: 'lespoulettes.benin@gmail.com',
        subject: '✓ Confirmation de commande - Les Poulettes',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #fbbf24; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
    .payment-box { background: #fef3c7; border: 2px solid #fbbf24; padding: 20px; margin: 20px 0; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; }
    .total { font-size: 20px; font-weight: bold; color: #fbbf24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #000;">✓ Commande confirmée</h1>
    </div>

    <div class="content">
      <p>Bonjour <strong>${result.Nom}</strong>,</p>

      <p>Nous avons bien reçu votre commande <strong>#${result.id}</strong>. Merci pour votre confiance !</p>

      <h2 style="color: #fbbf24; border-bottom: 2px solid #fbbf24; padding-bottom: 10px;">📦 Détails de votre commande</h2>

      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th style="text-align: center;">Quantité</th>
            <th style="text-align: right;">Prix unitaire</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${articlesHTML}
        </tbody>
      </table>

      <p class="total">Total : ${result.total.toFixed(2)} EUROS</p>

      <div class="payment-box">
        <h3 style="margin-top: 0; color: #92400e;">💳 Instructions de paiement Mobile Money</h3>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li>Contactez-nous au <strong>+229 XX XX XX XX</strong> pour recevoir le QR Code</li>
          <li>Scannez le QR Code avec votre app mobile (MTN, Moov, Orange)</li>
          <li>Effectuez le paiement de <strong>${result.total.toFixed(2)} EUROS</strong></li>
          <li>Votre commande sera validée après réception du paiement</li>
        </ol>
        <p style="margin-bottom: 0;"><strong>💡 Astuce :</strong> Vous pouvez aussi nous envoyer une capture d'écran du paiement par WhatsApp.</p>
      </div>

      <h3 style="color: #fbbf24;">📍 Adresse de livraison</h3>
      <p style="background: #f9fafb; padding: 15px; border-left: 4px solid #fbbf24; margin: 10px 0;">
        ${result.adresse}
      </p>

      ${result.notes ? `
      <h3 style="color: #fbbf24;">📝 Vos notes</h3>
      <p style="background: #f9fafb; padding: 15px; border-left: 4px solid #fbbf24; margin: 10px 0;">
        ${result.notes}
      </p>
      ` : ''}

      <p style="margin-top: 30px;">Nous vous contacterons prochainement pour confirmer les détails de livraison.</p>

      <p>Cordialement,<br><strong>L'équipe Les Poulettes</strong></p>
    </div>

    <div class="footer">
      <p>Cet email a été envoyé automatiquement suite à votre commande sur notre site.</p>
      <p>Pour toute question : lespoulettes.benin@gmail.com</p>
    </div>
  </div>
</body>
</html>
        `,
      });

      if (error) {
        console.error('❌ Erreur Resend:', error);
      } else {
        console.log(`✅ Email envoyé avec succès ! ID: ${data.id}`);
        
        // ✅ Marquer l'email comme envoyé dans la base de données
        await strapi.entityService.update('api::commande.commande', result.id, {
          data: {
            email_sent: true,
          },
        });
        console.log(`✅ Champ email_sent mis à jour pour commande #${result.id}`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi:', error);
    }
  },
};