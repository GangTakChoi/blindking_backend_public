
module.exports = {
  apps : [
      {
        name: "blindking-backend",
        script: "./bin/www",
        watch: true,
        // instances: 1,
        exec_mode: 'fork',
        node_args: '-r ./config/env',
        env: {
            "NODE_ENV": "development"
        },
        env_production: {
            "NODE_ENV": "production",
        }
      }
  ]
}
