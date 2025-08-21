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
    restart_delay: 1000,
    // Auto-restart configuration
    autorestart: true, // Automatically restart on crash (default: true)
    max_restarts: 10, // Maximum restarts within restart_time window
    min_uptime: "10s", // Minimum uptime before considering restart successful
    restart_time: 60000, // Time window for max_restarts (1 minute)
    // Exponential backoff restart delay
    exp_backoff_restart_delay: 100, // Start with 100ms delay
    // Watch for file changes (optional - usually disabled in production)
    watch: false,
    // Ignore watch on specific folders
    ignore_watch: ["node_modules", "logs", "uploads"]
  }]
};
