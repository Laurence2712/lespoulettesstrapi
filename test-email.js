const strapi = require('@strapi/strapi');

async function testEmail() {
  const app = await strapi().load();
  
  try {
    await app.plugins['email'].services.email.send({
      to: 'votre-email@gmail.com',
      from: 'votre-email-verifie@votredomaine.com',
      subject: 'Test email Les Poulettes',
      html: '<h1>✅ Email envoyé avec succès !</h1><p>SendGrid fonctionne !</p>',
    });
    
    console.log('✅ Email de test envoyé !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
  
  process.exit(0);
}

testEmail();