module.exports = {
  apps: [
    {
      name: "leaddrive-v2",
      script: "/opt/leaddrive-v2/.next/standalone/server.js",
      cwd: "/opt/leaddrive-v2/.next/standalone",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        HOSTNAME: "0.0.0.0",
      },
      error_file: "/opt/leaddrive-v2/logs/error.log",
      out_file: "/opt/leaddrive-v2/logs/out.log",
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
