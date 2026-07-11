module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      script: 'index.js',
      interpreter: 'node',
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/bot-error.log',
      out_file: 'logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'web-server',
      script: 'web/server/index.js',
      interpreter: 'node',
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/server-error.log',
      out_file: 'logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
