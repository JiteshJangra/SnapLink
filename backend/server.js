/**
 * server.js — Entry point
 *
 * Uses Node.js cluster module to fork one worker per CPU core,
 * demonstrating horizontal scaling / multi-process architecture.
 */
const cluster = require('cluster');
const os = require('os');
require('dotenv').config();

const NUM_WORKERS = process.env.NODE_ENV === 'production'
  ? os.cpus().length
  : 1; // Single process in dev for easier debugging

if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  console.log(`[Primary] PID ${process.pid} — forking ${NUM_WORKERS} workers`);

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Primary] Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork(); // Auto-restart on crash
  });
} else {
  // Worker process (or single dev process) — start Express
  const app = require('./src/app');
  const { connectDB } = require('./src/config/database');
  const { connectRedis } = require('./src/config/redis');
  const logger = require('./src/utils/logger');

  const PORT = process.env.PORT || 3001;

  async function start() {
    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`[Worker ${process.pid}] Server running on port ${PORT}`);
    });
  }

  start().catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
}
