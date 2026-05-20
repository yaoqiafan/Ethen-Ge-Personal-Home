module.exports = {
  apps: [{
    name: 'kitchen-api',
    script: 'server.ts',
    interpreter: 'node',
    interpreter_args: '--experimental-strip-types --dns-result-order=ipv4first',
    watch: false,
    env: {
      NODE_ENV: 'production',
    },
  }],
}
