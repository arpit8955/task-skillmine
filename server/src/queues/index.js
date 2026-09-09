import { Queue } from 'bullmq';
import { getRedisConnection, isRedisConnected } from '../config/redis.js';
import { processAgentJobDirect, processActionJobDirect } from '../workers/index.js';
import logger from '../utils/logger.js';

let agentProcessingQueue = null;
let actionExecutionQueue = null;

export function getAgentProcessingQueue() {
  if (!agentProcessingQueue) {
    try {
      agentProcessingQueue = new Queue('agent-processing', {
        connection: getRedisConnection(),
        defaultJobOptions: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 100 },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });
    } catch (err) {
      logger.warn('Could not initialize BullMQ agent queue', { error: err.message });
    }
  }
  return agentProcessingQueue;
}

export function getActionExecutionQueue() {
  if (!actionExecutionQueue) {
    try {
      actionExecutionQueue = new Queue('action-execution', {
        connection: getRedisConnection(),
        defaultJobOptions: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });
    } catch (err) {
      logger.warn('Could not initialize BullMQ action queue', { error: err.message });
    }
  }
  return actionExecutionQueue;
}

export async function enqueueAgentProcessing(eventId) {
  if (isRedisConnected()) {
    try {
      const queue = getAgentProcessingQueue();
      if (queue) {
        return await queue.add('process-event', { eventId }, {
          jobId: `agent-${eventId}`,
        });
      }
    } catch (err) {
      logger.warn('BullMQ enqueue failed, falling back to direct async', { eventId, error: err.message });
    }
  }

  setImmediate(async () => {
    try {
      await processAgentJobDirect(eventId);
    } catch (err) {
      logger.error('Direct async agent processing failed', { eventId, error: err.message });
    }
  });
  return { id: `direct-${eventId}`, eventId };
}

export async function enqueueActionExecution(eventId, actionType, payload) {
  if (isRedisConnected()) {
    try {
      const queue = getActionExecutionQueue();
      if (queue) {
        return await queue.add('execute-action', { eventId, actionType, payload }, {
          jobId: `action-${eventId}-${actionType}`,
        });
      }
    } catch (err) {
      logger.warn('BullMQ action enqueue failed, falling back to direct async', { eventId, error: err.message });
    }
  }

  setImmediate(async () => {
    try {
      await processActionJobDirect(eventId, actionType, payload);
    } catch (err) {
      logger.error('Direct async action processing failed', { eventId, error: err.message });
    }
  });
  return { id: `direct-action-${eventId}`, eventId };
}
