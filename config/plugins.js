module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: env('RESEND_API_KEY'),
        },
      },
      settings: {
        defaultFrom: env('EMAIL_FROM', 'Les Poulettes <noreply@laurencepirard.be>'),
        defaultReplyTo: env('EMAIL_REPLY_TO', 'laurencepirard27@gmail.com'),
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
        upload: {
          // Auto-convert to WebP for supported browsers, fall back to original format
          // quality: auto balances file size vs. visual quality automatically
          transformation: [{ fetch_format: 'auto', quality: 'auto' }],
          responsive_breakpoints: [
            {
              create_derived: true,
              bytes_step: 20000,
              min_width: 320,
              max_width: 1920,
              max_images: 6,
              transformation: { fetch_format: 'auto', quality: 'auto' },
            },
          ],
        },
        uploadStream: {
          transformation: [{ fetch_format: 'auto', quality: 'auto' }],
          responsive_breakpoints: [
            {
              create_derived: true,
              bytes_step: 20000,
              min_width: 320,
              max_width: 1920,
              max_images: 6,
              transformation: { fetch_format: 'auto', quality: 'auto' },
            },
          ],
        },
        delete: {},
      },
    },
  },
});