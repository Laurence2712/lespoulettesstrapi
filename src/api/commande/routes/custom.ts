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
    {
      method: 'POST',
      path: '/commandes/create-bank-transfer-order',
      handler: 'commande.createBankTransferOrder',
      config: {
        auth: false,
      },
    },
  ],
};
