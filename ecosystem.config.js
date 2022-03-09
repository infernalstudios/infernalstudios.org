/* eslint-disable */
// PM2 configuration file
module.exports = {
  apps: [
    {
      name: "api",
      script: "dist/index.js",
      args: "start",
      watch: false,
      exec_mode: "cluster",
      instances: "max",
      max_memory_restart: "128M",
      min_uptime: 8000,
      listen_timeout: 6000,
      cron_restart: "0 0 * * *",
    },
  ],
};
