import IORedis from 'ioredis';
import config from './index.js';
import logger from '../utils/logger.js';

let redisConnection = null;
let redisAvailable = false;

export function isRedisConnected() {
  return redisAvailable;
}

export function getRedisConnection() {
  if (!redisConnection) {
    redisConnection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          redisAvailable = false;
          return null;
        }
        return Math.min(times * 300, 1500);
      },
    });

    redisConnection.on('connect', () => {
      redisAvailable = true;
      logger.info('Redis connected successfully');
    });

    redisConnection.on('ready', () => {
      redisAvailable = true;
    });

    redisConnection.on('error', (err) => {
      if (!redisAvailable) {
        logger.warn('Redis unavailable, background pipeline operating in direct resilient async mode', { error: err.message });
      }
      redisAvailable = false;
    });

    redisConnection.connect().catch(() => {
      redisAvailable = false;
    });
  }
  return redisConnection;
}

export function createNewRedisConnection() {
  return new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => (times > 3 ? null : 1500),
  });
}

export async function disconnectRedis() {
  if (redisConnection) {
    try {
      await redisConnection.quit();
    } catch {
      redisConnection.disconnect();
    }
    redisConnection = null;
    redisAvailable = false;
  }
}
