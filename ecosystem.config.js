module.exports = {
  apps: [
    {
      name: 'grip-backend',
      script: 'node',
      args: '-r ts-node/register ./src/index.ts',  
      watch: false,                                
      time: false,
      error_file: './pm2logs/err.log',
      out_file: './pm2logs/out.log',
      // env: {
      //   NODE_ENV: 'development',
      // },
      // env: {
      //   NODE_ENV: 'production',
      // },
      // env: {
      //   NODE_ENV: 'staging',
      // },
    },
  ],
};
