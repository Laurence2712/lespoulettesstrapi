export default {
  routes: [
    {
      method: 'POST',
      path: '/commandes/create-checkout-session',
      handler: 'commande.createCheckoutSession',
      config: {
        auth: false,
      },
    },
  ],
};
