module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      script: 'index.js',
      cwd: '.',
      interpreter: 'node',
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      // Auto-restart on crash, max 10 restarts in 30s before giving up
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,
      error_file: 'logs/bot-error.log',
      out_file: 'logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    },
    {
      name: 'web-server',
      script: 'web/server/index.js',
      cwd: '.',
      interpreter: 'node',
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,
      error_file: 'logs/server-error.log',
      out_file: 'logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ]
};
