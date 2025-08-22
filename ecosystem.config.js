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
    // Enhanced auto-restart configuration (no sudo required)
    autorestart: true, // Automatically restart on crash (default: true)
    max_restarts: 50, // Increased from 10 - allow more restarts
    min_uptime: "30s", // Increased from 10s - app must run 30s to count as successful
    restart_time: 600000, // Increased to 10 minutes window for max_restarts
    // Exponential backoff restart delay
    exp_backoff_restart_delay: 100, // Start with 100ms delay, grows exponentially
    // Watch for file changes (disabled in production)
    watch: false,
    // Ignore watch on specific folders
    ignore_watch: ["node_modules", "logs", "uploads"],
    // NOTE: Removed cron_restart as it may require system-level permissions
    // Manual restarts will be handled by user-level cron jobs instead
    // Merge logs to prevent file handle issues
    merge_logs: true,
    // Log rotation to prevent disk space issues
    log_type: "json",
    // Force color in logs for better debugging
    force_color: true
  }]
};
