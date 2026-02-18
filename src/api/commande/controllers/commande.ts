import { factories } from '@strapi/strapi';
import Stripe from 'stripe';

export default factories.createCoreController('api::commande.commande', ({ strapi }) => ({
  async createBankTransferOrder(ctx) {
    const { items, email, nom, telephone, adresse, notes } = ctx.request.body as any;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return ctx.badRequest('Le panier est vide');
    }

    if (!email || !nom || !telephone) {
      return ctx.badRequest('Informations client manquantes');
    }

    try {
      const total = items.reduce((sum: number, item: any) => sum + Number(item.prix) * item.quantity, 0);

      const commande = await strapi.documents('api::commande.commande').create({
        data: {
          Nom: nom,
          Email: email,
          Telephone: telephone,
          adresse: adresse || '',
          articles: JSON.stringify(items),
          total,
          statut: 'en_attente',
          methode_paiement: 'virement',
          notes: notes || '',
        },
      });

      ctx.body = {
        success: true,
        commande_id: commande.documentId,
        message: 'Commande enregistrée avec succès',
      };
    } catch (err: any) {
      strapi.log.error('Bank transfer order error:', err);
      return ctx.internalServerError(err.message || 'Erreur lors de la création de la commande');
    }
  },

  async createCheckoutSession(ctx) {
    const { items, email, nom, telephone, adresse, notes } = ctx.request.body as any;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return ctx.badRequest('Le panier est vide');
    }

    if (!email || !nom || !telephone) {
      return ctx.badRequest('Informations client manquantes');
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      strapi.log.error('STRIPE_SECRET_KEY is not configured');
      return ctx.internalServerError('Configuration de paiement manquante');
    }

    const stripe = new Stripe(stripeSecretKey);

    const frontendUrl = process.env.FRONTEND_URL || 'https://lespoulettes.laurencepirard.be';

    try {
      const lineItems = items.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            ...(item.image_url ? { images: [item.image_url] } : {}),
          },
          unit_amount: Math.round(Number(item.prix) * 100),
        },
        quantity: item.quantity,
      }));

      const commande = await strapi.documents('api::commande.commande').create({
        data: {
          Nom: nom,
          Email: email,
          Telephone: telephone,
          adresse: adresse || '',
          articles: JSON.stringify(items),
          total: items.reduce((sum: number, item: any) => sum + Number(item.prix) * item.quantity, 0),
          statut: 'en_attente',
          methode_paiement: 'carte',
          notes: notes || '',
        },
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'bancontact'],
        line_items: lineItems,
        mode: 'payment',
        customer_email: email,
        success_url: `${frontendUrl}/paiement-reussi?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/panier`,
        metadata: {
          commande_id: String(commande.documentId),
          nom,
          telephone,
        },
      });

      await strapi.documents('api::commande.commande').update({
        documentId: commande.documentId,
        data: { stripe_session_id: session.id },
      });

      ctx.body = { url: session.url };
    } catch (err: any) {
      strapi.log.error('Stripe checkout error:', err);
      return ctx.internalServerError(err.message || 'Erreur lors de la création de la session de paiement');
    }
  },
}));
