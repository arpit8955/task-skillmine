import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

let agentProcessingQueue = null;
let actionExecutionQueue = null;

export function getAgentProcessingQueue() {
  if (!agentProcessingQueue) {
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
  }
  return agentProcessingQueue;
}

export function getActionExecutionQueue() {
  if (!actionExecutionQueue) {
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
  }
  return actionExecutionQueue;
}

export async function enqueueAgentProcessing(eventId) {
  const queue = getAgentProcessingQueue();
  return queue.add('process-event', { eventId }, {
    jobId: `agent-${eventId}`,
  });
}

export async function enqueueActionExecution(eventId, actionType, payload) {
  const queue = getActionExecutionQueue();
  return queue.add('execute-action', { eventId, actionType, payload }, {
    jobId: `action-${eventId}-${actionType}`,
  });
}
