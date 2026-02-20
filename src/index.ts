import type { Core } from '@strapi/strapi';

const COMMANDE_CONTENT_MANAGER_CONFIG = {
  uid: 'api::commande.commande',
  settings: {
    bulkable: true,
    filterable: true,
    searchable: true,
    pageSize: 25,
    mainField: 'Nom',
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'DESC',
  },
  metadatas: {
    id: { edit: {}, list: { label: 'id', searchable: true, sortable: true } },
    Nom: {
      edit: { label: 'Nom', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Nom', searchable: true, sortable: true },
    },
    Email: {
      edit: { label: 'Email', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Email', searchable: true, sortable: true },
    },
    Telephone: {
      edit: { label: 'Téléphone', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Téléphone', searchable: false, sortable: false },
    },
    mode_livraison: {
      edit: { label: 'Mode de livraison', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Livraison', searchable: true, sortable: true },
    },
    pays: {
      edit: { label: 'Pays', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Pays', searchable: false, sortable: false },
    },
    code_postal: {
      edit: { label: 'Code postal', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Code postal', searchable: false, sortable: false },
    },
    ville: {
      edit: { label: 'Ville', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Ville', searchable: false, sortable: false },
    },
    rue: {
      edit: { label: 'Rue et numéro', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Rue', searchable: false, sortable: false },
    },
    adresse: {
      edit: { label: 'Adresse (legacy)', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Adresse', searchable: false, sortable: false },
    },
    articles: {
      edit: { label: 'Articles', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Articles', searchable: false, sortable: false },
    },
    total: {
      edit: { label: 'Total', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Total (€)', searchable: false, sortable: true },
    },
    statut: {
      edit: { label: 'Statut', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Statut', searchable: true, sortable: true },
    },
    notes: {
      edit: { label: 'Notes', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Notes', searchable: false, sortable: false },
    },
    email_sent: {
      edit: { label: 'Email envoyé', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Email envoyé', searchable: false, sortable: true },
    },
    methode_paiement: {
      edit: { label: 'Méthode de paiement', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Paiement', searchable: true, sortable: true },
    },
    stripe_session_id: {
      edit: { label: 'Stripe Session ID', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Stripe Session', searchable: false, sortable: false },
    },
    stripe_payment_intent: {
      edit: { label: 'Stripe Payment Intent', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Stripe Intent', searchable: false, sortable: false },
    },
    createdAt: {
      edit: { label: 'Date de commande', description: '', placeholder: '', visible: false, editable: false },
      list: { label: 'Date', searchable: false, sortable: true },
    },
    updatedAt: {
      edit: { label: 'Modifié le', description: '', placeholder: '', visible: false, editable: false },
      list: { label: 'Modifié le', searchable: false, sortable: true },
    },
  },
  layouts: {
    list: ['createdAt', 'Nom', 'statut', 'total', 'methode_paiement', 'email_sent'],
    editRelations: [],
    edit: [
      [{ name: 'Nom', size: 6 }, { name: 'Email', size: 6 }],
      [{ name: 'Telephone', size: 6 }, { name: 'methode_paiement', size: 6 }],
      [{ name: 'mode_livraison', size: 12 }],
      [{ name: 'rue', size: 12 }],
      [{ name: 'ville', size: 4 }, { name: 'code_postal', size: 4 }, { name: 'pays', size: 4 }],
      [{ name: 'adresse', size: 12 }],
      [{ name: 'articles', size: 12 }],
      [{ name: 'total', size: 4 }, { name: 'statut', size: 4 }, { name: 'email_sent', size: 4 }],
      [{ name: 'notes', size: 12 }],
      [{ name: 'stripe_session_id', size: 6 }, { name: 'stripe_payment_intent', size: 6 }],
    ],
  },
};

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

async function setCommandeListViewConfig(strapi: Core.Strapi) {
  try {
    const store = strapi.store({ type: 'plugin', name: 'content-manager' });
    const key = 'configuration_content_types::api::commande.commande';
    await store.set({ key, value: COMMANDE_CONTENT_MANAGER_CONFIG });
    strapi.log.info('bootstrap: Commande list view configuration set');
  } catch (e) {
    strapi.log.warn('bootstrap: Could not set commande list view config', e);
  }
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await setPublicPermissions(strapi);
    await setCommandeListViewConfig(strapi);
  },
};
