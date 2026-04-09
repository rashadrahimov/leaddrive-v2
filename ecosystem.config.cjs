const APP_DIR = process.env.APP_DIR || "/opt/leaddrive-v2"
const APP_PORT = process.env.APP_PORT || 3001

module.exports = {
  apps: [
    {
      name: process.env.PM2_NAME || "leaddrive-v2",
      script: `${APP_DIR}/.next/standalone/server.js`,
      cwd: `${APP_DIR}/.next/standalone`,
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: APP_PORT,
        HOSTNAME: "0.0.0.0",
      },
      error_file: `${APP_DIR}/logs/error.log`,
      out_file: `${APP_DIR}/logs/out.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
      autorestart: true,
      max_memory_restart: "512M",
      kill_timeout: 10000,
      listen_timeout: 10000,
    },
  ],
};
