module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      connectionString: env('DATABASE_URL'),
      ssl: env('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10
    },
    acquireConnectionTimeout: 60000,
  },
  settings: {
    forceMigration: true,
  },
});