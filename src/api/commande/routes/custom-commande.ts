export default {
  routes: [
    {
      method: 'POST',
      path: '/api/commandes/create-checkout-session',
      handler: 'commande.createCheckoutSession',
      config: {
        auth: false,
      },
    },
  ],
};
