module.exports = {
  apps: [
    {
      name: 'tabsis-api',
      script: './bin/www',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
