import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/support-ops-agent',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  agent: {
    confidenceThreshold: parseFloat(process.env.AGENT_CONFIDENCE_THRESHOLD) || 0.85,
    approvalExpiryMinutes: parseInt(process.env.APPROVAL_EXPIRY_MINUTES, 10) || 60,
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
    retryBaseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS, 10) || 1000,
    staleProcessingTimeoutMs: parseInt(process.env.STALE_PROCESSING_TIMEOUT_MS, 10) || 300000,
    schedulerIntervalMs: parseInt(process.env.SCHEDULER_INTERVAL_MS, 10) || 60000,
  },
};

export default config;
