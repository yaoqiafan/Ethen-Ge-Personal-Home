module.exports = {
  apps: [{
    name: 'kitchen-api',
    script: 'server.ts',
    interpreter: 'node',
    interpreter_args: '--experimental-strip-types',
    watch: false,
    env: {
      NODE_ENV: 'production',
    },
  }],
}
