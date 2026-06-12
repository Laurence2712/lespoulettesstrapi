import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['fr'],
  },

  register(app: StrapiApp) {
    app.customFields.register({
      name: 'articles',
      type: 'json',
      intlLabel: { id: 'cf.articles.label', defaultMessage: 'Articles' },
      intlDescription: { id: 'cf.articles.desc', defaultMessage: 'Articles de la commande' },
      components: {
        Input: async () => import('./extensions/ArticlesField'),
      },
    });

    app.customFields.register({
      name: 'statut',
      type: 'string',
      intlLabel: { id: 'cf.statut.label', defaultMessage: 'Statut' },
      intlDescription: { id: 'cf.statut.desc', defaultMessage: 'Statut de la commande' },
      components: {
        Input: async () => import('./extensions/StatutField'),
      },
    });

    app.customFields.register({
      name: 'email-sent',
      type: 'boolean',
      intlLabel: { id: 'cf.email-sent.label', defaultMessage: 'Email envoyé' },
      intlDescription: { id: 'cf.email-sent.desc', defaultMessage: 'Email de confirmation envoyé' },
      components: {
        Input: async () => import('./extensions/EmailSentField'),
      },
    });
  },

  bootstrap(_app: StrapiApp) {},
};
