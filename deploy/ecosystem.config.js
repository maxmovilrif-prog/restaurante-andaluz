// PM2 process manager config. Run from the repo root on the server:
//   pm2 start deploy/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'restaurante-andaluz',
      cwd: __dirname + '/../backend',
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
