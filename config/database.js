module.exports = ({ env }) => {
  // debug: print selected DB env values when Strapi loads this file
  // (this will appear in the Strapi startup logs)
  console.log('[config/database] DATABASE_CLIENT=', env('DATABASE_CLIENT', 'sqlite'));
  console.log('[config/database] DATABASE_FILENAME=', env('DATABASE_FILENAME', '.tmp/data.db'));

  return {
    connection: {
      client: env('DATABASE_CLIENT', 'sqlite'),
      connection: {
        filename: env('DATABASE_FILENAME', '.tmp/data.db'),
      },
      useNullAsDefault: true,
    },
  };
};
