module.exports = ({ env }) => ({
email: {
  config: {
    provider: 'nodemailer',
    providerOptions: {
      host: 'smtp.resend.com',
      port: 587,  // ✅ Port 587 au lieu de 465
      secure: false,  // ✅ false pour TLS
      auth: {
        user: 'resend',
        pass: env('EMAIL_API_KEY'),
      },
      tls: {
        rejectUnauthorized: false,  // ✅ Important pour certains hébergeurs
      },
    },
    settings: {
      defaultFrom: env('EMAIL_FROM'),
      defaultReplyTo: env('EMAIL_FROM'),
    },
  },
},
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});