import type { Core } from '@strapi/strapi';

const PUBLIC_PERMISSIONS = [
  // Commande endpoints
  { action: 'api::commande.commande.find' },
  { action: 'api::commande.commande.findOne' },
  { action: 'api::commande.commande.create' },
  // Realisation (produits/portfolio)
  { action: 'api::realisation.realisation.find' },
  { action: 'api::realisation.realisation.findOne' },
  // Actualite (news)
  { action: 'api::actualite.actualite.find' },
  { action: 'api::actualite.actualite.findOne' },
  // Homepage (single type)
  { action: 'api::homepage.homepage.find' },
];

async function setPublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi
    .db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn('bootstrap: Public role not found, skipping permission setup');
    return;
  }

  for (const { action } of PUBLIC_PERMISSIONS) {
    const existing = await strapi
      .db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });

    if (existing) {
      if (!existing.enabled) {
        await strapi
          .db
          .query('plugin::users-permissions.permission')
          .update({ where: { id: existing.id }, data: { enabled: true } });
        strapi.log.info(`bootstrap: enabled permission ${action}`);
      }
    } else {
      await strapi
        .db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: publicRole.id, enabled: true } });
      strapi.log.info(`bootstrap: created permission ${action}`);
    }
  }

  strapi.log.info('bootstrap: Public role permissions configured successfully');
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await setPublicPermissions(strapi);
  },
};
