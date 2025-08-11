module.exports = {
  apps: [{
    name: "travel-log",
    script: "server.js",
    cwd: "./backend",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3001
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3001
    },
    log_date_format: "YYYY-MM-DD HH:mm Z",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_file: "./logs/combined.log",
    time: true,
    max_memory_restart: "500M",
    node_args: "--max_old_space_size=512",
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
