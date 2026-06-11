import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import Stripe from 'stripe';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:1337';

/** Build a valid Stripe-Signature header value from a raw payload + webhook secret. */
function buildStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

const baseOrder = {
  items: [{ title: 'Bouquet Test E2E', prix: 20, quantity: 1 }],
  nom: 'Playwright Test',
  telephone: '0400123456',
  mode_livraison: 'retrait_gratuit',
  pays: 'Belgique',
  code_postal: '1000',
  ville: 'Bruxelles',
  rue: 'Rue du Test 1',
  adresse: 'Rue du Test 1, 1000 Bruxelles',
};

// ---------------------------------------------------------------------------
// Bank-transfer order (no external dependencies)
// ---------------------------------------------------------------------------
test.describe('Commande — virement bancaire', () => {
  test('crée une commande et retourne commande_id', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/commandes/create-bank-transfer-order`, {
      data: { ...baseOrder, email: `virement-${Date.now()}@playwright.test` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.commande_id).toBe('string');
  });

  test('rejette un panier vide', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/commandes/create-bank-transfer-order`, {
      data: { ...baseOrder, email: `test@playwright.test`, items: [] },
    });
    expect(res.status()).toBe(400);
  });

  test('rejette des infos client manquantes', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/commandes/create-bank-transfer-order`, {
      data: { ...baseOrder, email: '', nom: '', telephone: '' },
    });
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Stripe checkout session (requires STRIPE_SECRET_KEY=sk_test_…)
// ---------------------------------------------------------------------------
test.describe('Commande — Stripe checkout', () => {
  test('POST /create-checkout-session retourne une URL Stripe', async ({ request }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      test.skip();
      return;
    }

    const res = await request.post(`${BASE_URL}/api/commandes/create-checkout-session`, {
      data: { ...baseOrder, email: `checkout-${Date.now()}@playwright.test` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
  });
});

// ---------------------------------------------------------------------------
// Stripe webhook
// ---------------------------------------------------------------------------
test.describe('Stripe webhook', () => {
  test('rejette une signature invalide quand STRIPE_WEBHOOK_SECRET est configuré', async ({ request }) => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      test.skip();
      return;
    }

    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_fake', metadata: {} } },
    });

    const res = await request.post(`${BASE_URL}/api/commandes/stripe-webhook`, {
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'invalid',
      },
      data: payload,
    });

    expect(res.status()).toBe(400);
  });

  test('accepte un événement inconnu et répond { received: true }', async ({ request }) => {
    // When no webhook secret is configured, the endpoint processes any event (dev mode)
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      test.skip();
      return;
    }

    const payload = JSON.stringify({
      type: 'customer.created',
      data: { object: {} },
    });

    const res = await request.post(`${BASE_URL}/api/commandes/stripe-webhook`, {
      headers: { 'content-type': 'application/json' },
      data: payload,
    });

    expect(res.status()).toBe(200);
    expect((await res.json()).received).toBe(true);
  });

  // Full end-to-end flow: checkout session → webhook → statut "payé"
  // Requires STRIPE_SECRET_KEY (sk_test_…) AND STRIPE_WEBHOOK_SECRET (whsec_…)
  test('flow complet : checkout → webhook → commande.statut = payé', async ({ request }) => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      test.skip();
      return;
    }

    const uniqueEmail = `e2e-${Date.now()}@playwright.test`;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 1. Créer une session Stripe + commande Strapi
    const checkoutRes = await request.post(`${BASE_URL}/api/commandes/create-checkout-session`, {
      data: { ...baseOrder, email: uniqueEmail },
    });
    expect(checkoutRes.status()).toBe(200);
    const { url } = await checkoutRes.json();
    expect(url).toBeTruthy();

    // 2. Récupérer la session Stripe pour obtenir son ID
    const sessions = await stripe.checkout.sessions.list({ limit: 5 });
    const session = sessions.data.find(s => s.customer_email === uniqueEmail);
    expect(session).toBeTruthy();
    const sessionId = session!.id;

    // 3. Retrouver la commande Strapi par email pour vérifier l'état initial
    const findRes = await request.get(
      `${BASE_URL}/api/commandes?filters[Email][$eq]=${encodeURIComponent(uniqueEmail)}`
    );
    expect(findRes.status()).toBe(200);
    const { data: commandes } = await findRes.json();
    expect(commandes.length).toBeGreaterThan(0);
    const commande = commandes[0];
    expect(commande.statut).toBe('en_attente');

    // 4. Construire et signer l'événement webhook checkout.session.completed
    const webhookPayload = JSON.stringify({
      id: `evt_e2e_${Date.now()}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          payment_status: 'paid',
          payment_intent: `pi_test_${Date.now()}`,
          customer_email: uniqueEmail,
          metadata: {
            commande_id: commande.documentId,
            nom: baseOrder.nom,
            telephone: baseOrder.telephone,
          },
        },
      },
    });

    const stripeSignature = buildStripeSignature(
      webhookPayload,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // 5. Envoyer le webhook
    const webhookRes = await request.post(`${BASE_URL}/api/commandes/stripe-webhook`, {
      headers: {
        'content-type': 'application/json',
        'stripe-signature': stripeSignature,
      },
      data: webhookPayload,
    });
    expect(webhookRes.status()).toBe(200);
    expect((await webhookRes.json()).received).toBe(true);

    // 6. Vérifier que le statut a bien été mis à jour (laisser le temps à l'update async)
    await new Promise(r => setTimeout(r, 1500));

    const updatedRes = await request.get(
      `${BASE_URL}/api/commandes?filters[Email][$eq]=${encodeURIComponent(uniqueEmail)}`
    );
    expect(updatedRes.status()).toBe(200);
    const { data: updated } = await updatedRes.json();
    expect(updated[0].statut).toBe('payé');
  });
});
