import type { Schema, Struct } from '@strapi/strapi';

export interface ProduitDeclinaisons extends Struct.ComponentSchema {
  collectionName: 'components_produit_declinaisons_s';
  info: {
    description: '';
    displayName: 'Declinaisons ';
  };
  attributes: {
    CoupDeCoeur: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    Description: Schema.Attribute.Text;
    Image: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    Stock: Schema.Attribute.Integer;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'produit.declinaisons': ProduitDeclinaisons;
    }
  }
}
