module.exports = {
  apps: [
    {
      name: 'your-app-name',
      script: 'ts-node-dev',
      args: '--respawn --transpileOnly ./src/index.ts',  // Use ts-node-dev for hot reloading
      watch: true,  // Watch files for changes (use cautiously in production)
      time: true,
      error_file: './pm2logs/err.log',
      out_file: './pm2logs/out.log',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
