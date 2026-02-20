import { factories } from '@strapi/strapi';
import Stripe from 'stripe';

export default factories.createCoreController('api::commande.commande', ({ strapi }) => ({
  async createBankTransferOrder(ctx) {
    const { items, email, nom, telephone, mode_livraison, pays, code_postal, ville, rue, adresse, notes } = ctx.request.body as any;

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
          mode_livraison: mode_livraison || 'livraison_domicile',
          pays: pays || '',
          code_postal: code_postal || '',
          ville: ville || '',
          rue: rue || '',
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
    const { items, email, nom, telephone, mode_livraison, pays, code_postal, ville, rue, adresse, notes } = ctx.request.body as any;

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
          mode_livraison: mode_livraison || 'livraison_domicile',
          pays: pays || '',
          code_postal: code_postal || '',
          ville: ville || '',
          rue: rue || '',
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
        success_url: `${frontendUrl}/panier/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/panier`,
        metadata: {
          commande_id: String(commande.documentId),
          nom,
          telephone,
        },
        payment_intent_data: {
          metadata: {
            commande_id: String(commande.documentId),
            nom,
            telephone,
          },
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

  async stripeWebhook(ctx) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey) {
      strapi.log.error('STRIPE_SECRET_KEY manquant');
      return ctx.internalServerError('Configuration Stripe manquante');
    }

    const stripe = new Stripe(stripeSecretKey);

    let event: any;

    try {
      // Strapi expose le body brut via Symbol('unparsedBody') quand includeUnparsed: true
      const unparsed = (ctx.request.body as any)[Symbol.for('unparsedBody')];
      const rawBody = unparsed || JSON.stringify(ctx.request.body);
      const signature = ctx.request.headers['stripe-signature'] as string;

      if (webhookSecret && signature) {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } else {
        // Sans secret configuré, on fait confiance au body (dev/test uniquement)
        strapi.log.warn('STRIPE_WEBHOOK_SECRET absent — validation de signature désactivée');
        event = ctx.request.body;
      }
    } catch (err: any) {
      strapi.log.error('Webhook signature invalide:', err.message);
      ctx.status = 400;
      ctx.body = { error: `Webhook Error: ${err.message}` };
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session: any = event.data.object;
      const commandeId: string | undefined = session.metadata?.commande_id;

      if (!commandeId) {
        strapi.log.warn('Webhook: commande_id absent dans metadata Stripe');
        ctx.status = 200;
        ctx.body = { received: true };
        return;
      }

      try {
        // Chercher la commande par documentId
        const commandes = await strapi.documents('api::commande.commande').findMany({
          filters: { stripe_session_id: session.id } as any,
        });

        const commande = commandes[0];

        if (!commande) {
          strapi.log.warn(`Webhook: commande introuvable pour session ${session.id}`);
          ctx.status = 200;
          ctx.body = { received: true };
          return;
        }

        if (commande.statut !== 'payé') {
          await strapi.documents('api::commande.commande').update({
            documentId: commande.documentId,
            data: {
              statut: 'payé',
              stripe_payment_intent: typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id || '',
            } as any,
          });
          strapi.log.info(`✅ Commande ${commande.documentId} mise à jour → payé`);
        }
      } catch (err: any) {
        strapi.log.error('Webhook: erreur mise à jour commande:', err);
      }
    }

    ctx.status = 200;
    ctx.body = { received: true };
  },
}));
