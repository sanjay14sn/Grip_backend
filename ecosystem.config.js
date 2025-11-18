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


// module.exports = {
//   apps: [
//     {
//       name: "grip-backend",
//       script: "ts-node",
//       args: "-r tsconfig-paths/register src/index.ts",
//       watch: false,
//       instances: 1,
//       autorestart: true,
//       max_memory_restart: "1G",
//       env: {
//         NODE_ENV: "development",
//       },
//       env_production: {
//         NODE_ENV: "production",
//       },
//       error_file: "./pm2logs/err.log",
//       out_file: "./pm2logs/out.log",
//       time: true,
//     },
//   ],
// };


