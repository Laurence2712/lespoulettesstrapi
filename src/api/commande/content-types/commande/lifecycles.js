'use strict';

// ⚠️  NE PAS utiliser afterCreate : l'email serait envoyé avant que le paiement Stripe soit confirmé.
// ✅  On utilise afterUpdate : l'email est envoyé uniquement quand le statut passe à "payé"
//     (déclenché par le webhook Stripe une fois le paiement réellement encaissé).

module.exports = {
  async afterUpdate(event) {
    const { result, params } = event;

    // Envoyer l'email UNIQUEMENT quand le statut vient de passer à "payé"
    if (result.statut !== 'payé') return;

    // Vérifier que c'est bien ce champ qui a été mis à jour (évite les doublons)
    if (params.data?.statut !== 'payé') return;

    try {
      // Parser les articles
      const articles = JSON.parse(result.articles || '[]');

      // Générer le HTML des articles
      const articlesHTML = articles.map(item => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 12px; text-align: left; word-break: break-word; max-width: 0; width: 50%;">${item.title}</td>
          <td style="padding: 10px 12px; text-align: center; width: 12%; white-space: nowrap;">${item.quantity}</td>
          <td style="padding: 10px 12px; text-align: right; width: 19%; white-space: nowrap;">${Number(item.prix).toFixed(2)} €</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: bold; width: 19%; white-space: nowrap;">${(item.prix * item.quantity).toFixed(2)} €</td>
        </tr>
      `).join('');

      await strapi.plugin('email').service('email').send({
        to: result.Email,
        from: 'laurencepirard27@gmail.com',
        replyTo: 'laurencepirard27@gmail.com',
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
    table { width: 100%; border-collapse: collapse; margin: 20px 0; table-layout: fixed; }
    th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-weight: bold; font-size: 13px; }
    th:nth-child(1) { width: 50%; }
    th:nth-child(2) { width: 12%; text-align: center; }
    th:nth-child(3) { width: 19%; text-align: right; }
    th:nth-child(4) { width: 19%; text-align: right; }
    .total { font-size: 18px; font-weight: bold; color: #fbbf24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #000; font-size: 22px; white-space: nowrap;">✓ Commande confirmée !</h1>
    </div>

    <div class="content">
      <p>Bonjour <strong>${result.Nom}</strong>,</p>

      <p>Nous avons bien reçu votre paiement pour la commande <strong>#${result.id}</strong>. Merci pour votre confiance !</p>

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

      <p class="total">Total payé : ${result.total.toFixed(2)} €</p>

      <p style="margin-top: 30px;">Nous préparons votre commande et vous contacterons prochainement pour les détails de livraison.</p>

      <p>Cordialement,<br><strong>L'équipe Les Poulettes</strong></p>
    </div>

    <div class="footer">
      <p>Cet email a été envoyé automatiquement après confirmation de votre paiement.</p>
      <p>Pour toute question : laurencepirard27@gmail.com</p>
    </div>
  </div>
</body>
</html>
        `,
      });

      console.log('✅ Email de confirmation envoyé à', result.Email, 'pour la commande #', result.id);

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
      console.error('Détails:', error.message);
      if (error.response) {
        console.error('Réponse SendGrid:', error.response.body);
      }
    }
  },
};
