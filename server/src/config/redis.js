import IORedis from 'ioredis';
import config from './index.js';
import logger from '../utils/logger.js';

let redisConnection = null;

export function getRedisConnection() {
  if (!redisConnection) {
    redisConnection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    redisConnection.on('connect', () => logger.info('Redis connected'));
    redisConnection.on('error', (err) => logger.error('Redis error', { error: err.message }));
  }
  return redisConnection;
}

export function createNewRedisConnection() {
  return new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export async function disconnectRedis() {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
