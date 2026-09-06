/* ============================================================================
 * PM2 — process definition for the standalone Next server
 * ----------------------------------------------------------------------------
 * .cjs, not .js: package.json has no "type" field so Node treats .js here as
 * CommonJS anyway, but PM2 reads this file itself and the explicit extension
 * removes the question.
 * ========================================================================== */
module.exports = {
  apps: [
    {
      name: 'pwip',
      /* Started from .next/standalone so that Next resolves its own .next and
         public directories, and reads .env.production, relative to itself. */
      cwd: '/home/pwip/pwip/.next/standalone',
      script: 'server.js',

      /**
       * Fork, one instance.
       *
       * Cluster mode would fork one worker per core, and on a 1–2 vCPU
       * Hostinger plan that buys contention rather than throughput: Next's
       * server is already async, and the work that actually blocks — image
       * optimisation via sharp — releases the loop to a native thread pool.
       * Raise `instances` and switch exec_mode to 'cluster' only after a real
       * measurement says the single process is the bottleneck.
       */
      exec_mode: 'fork',
      instances: 1,

      env: {
        NODE_ENV: 'production',
        /* Bound to loopback deliberately. nginx is the only thing that should
           be reachable from outside; a server listening on 0.0.0.0 here would
           be answerable on http://<vps-ip>:3000 with no TLS and no firewall
           rule standing in the way, since ufw's rules are per-port. */
        HOSTNAME: '127.0.0.1',
        PORT: 3000,
      },

      /* Restart on memory runaway rather than letting the OOM killer choose
         what dies. Well above steady state for this app. */
      max_memory_restart: '600M',

      /* A crash loop should back off instead of hammering the box. */
      exp_backoff_restart_delay: 200,

      merge_logs: true,
      time: true,
      out_file: '/home/pwip/logs/pwip.out.log',
      error_file: '/home/pwip/logs/pwip.err.log',
    },
  ],
};
