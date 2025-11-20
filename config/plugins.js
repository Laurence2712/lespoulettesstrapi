module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'sendgrid',
      providerOptions: {
        apiKey: env('SENDGRID_API_KEY'),
      },
      settings: {
        defaultFrom: 'laurencepirard27@gmail.com',
        defaultReplyTo: 'laurencepirard27@gmail.com',
      },
    },
  },
});