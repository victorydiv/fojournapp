module.exports = {
  apps: [{
    name: "fojourn-travel-log",
    script: "server.js",
    cwd: "./backend",
    instances: 1, // Start with 1 instance on shared hosting
    exec_mode: "fork", // Use fork mode for shared hosting
    env: {
      NODE_ENV: "production",
      PORT: 3000 // DreamHost often uses port 3000
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    },
    log_date_format: "YYYY-MM-DD HH:mm Z",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_file: "./logs/combined.log",
    time: true,
    max_memory_restart: "200M", // Lower for shared hosting
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    restart_delay: 1000
  }]
};
