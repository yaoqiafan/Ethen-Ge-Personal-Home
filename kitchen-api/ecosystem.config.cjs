module.exports = {
  apps: [{
    name: 'kitchen-api',
    script: 'server.ts',
    interpreter: 'tsx',
    watch: false,
    env: {
      NODE_ENV: 'production',
    },
  }],
}
