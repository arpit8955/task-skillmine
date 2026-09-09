import http from 'http';
import app from './app.js';
import config from './config/index.js';
import { connectDatabase } from './config/database.js';
import { getRedisConnection } from './config/redis.js';
import { initializeSocketIO } from './sockets/index.js';
import { startWorkers } from './workers/index.js';
import { startScheduler } from './scheduler/index.js';
import logger from './utils/logger.js';

async function start() {
  await connectDatabase();
  getRedisConnection();

  const server = http.createServer(app);
  initializeSocketIO(server);
  startWorkers();
  startScheduler();

  server.listen(config.port, () => {
    logger.info(`Server started on port ${config.port}`, {
      env: config.env,
      model: config.openai.model,
    });
  });

  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    server.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
