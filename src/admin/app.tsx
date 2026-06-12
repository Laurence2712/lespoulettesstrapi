import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['fr'],
  },

  register(app: StrapiApp) {
    app.customFields.register({
      name: 'articles',
      pluginId: 'global',
      type: 'json',
      intlLabel: {
        id: 'custom-fields.articles.label',
        defaultMessage: 'Articles',
      },
      intlDescription: {
        id: 'custom-fields.articles.description',
        defaultMessage: 'Articles de la commande',
      },
      components: {
        Input: async () => import('./extensions/ArticlesField'),
      },
    });
  },

  bootstrap(_app: StrapiApp) {},
};
