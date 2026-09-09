import { SupportEvent, EVENT_STATES } from '../models/index.js';
import { expireApprovals } from '../services/approvalService.js';
import { enqueueAgentProcessing } from '../queues/index.js';
import { createAuditEntry, transitionEventState } from '../services/eventStateService.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let schedulerInterval = null;

export function startScheduler() {
  const intervalMs = config.agent.schedulerIntervalMs;

  schedulerInterval = setInterval(async () => {
    try {
      await runRecoveryChecks();
    } catch (error) {
      logger.error('Scheduler recovery check failed', { error: error.message });
    }
  }, intervalMs);

  logger.info('Scheduler started', { intervalMs });
}

async function runRecoveryChecks() {
  await recoverStalledEvents();
  await expireOldApprovals();
  await retryFailedEvents();
}

async function recoverStalledEvents() {
  const stalledTimeout = new Date(Date.now() - config.agent.staleProcessingTimeoutMs);

  const stalledEvents = await SupportEvent.find({
    status: { $in: [EVENT_STATES.INVESTIGATING, EVENT_STATES.DECIDING, EVENT_STATES.EXECUTING] },
    lastProcessedAt: { $lte: stalledTimeout },
  });

  for (const event of stalledEvents) {
    if (event.processingAttempts >= config.agent.maxRetries) {
      try {
        await transitionEventState(event.eventId, EVENT_STATES.FAILED, {
          reason: 'Stalled after max retries - requires manual intervention',
        });
      } catch (e) {
        logger.warn('Failed to transition stalled event to FAILED', { eventId: event.eventId });
      }

      await createAuditEntry({
        eventId: event.eventId,
        type: 'scheduler_recovery',
        message: 'Event stalled after max retries, marked as failed',
      });
      continue;
    }

    try {
      await transitionEventState(event.eventId, EVENT_STATES.QUEUED, {
        reason: 'Recovered from stalled state by scheduler',
      });
      await enqueueAgentProcessing(event.eventId);

      await createAuditEntry({
        eventId: event.eventId,
        type: 'scheduler_recovery',
        message: `Stalled event re-queued for processing (attempt ${event.processingAttempts + 1})`,
      });

      logger.info('Recovered stalled event', { eventId: event.eventId });
    } catch (e) {
      logger.warn('Failed to recover stalled event', { eventId: event.eventId, error: e.message });
    }
  }

  if (stalledEvents.length > 0) {
    logger.info('Stalled events recovered', { count: stalledEvents.length });
  }
}

async function expireOldApprovals() {
  const expiredCount = await expireApprovals();
  if (expiredCount > 0) {
    logger.info('Expired old approvals', { count: expiredCount });
  }
}

async function retryFailedEvents() {
  const retryableEvents = await SupportEvent.find({
    status: EVENT_STATES.FAILED,
    processingAttempts: { $lt: config.agent.maxRetries },
  }).limit(10);

  for (const event of retryableEvents) {
    try {
      await transitionEventState(event.eventId, EVENT_STATES.QUEUED, {
        reason: 'Scheduler retry of failed event',
      });
      await enqueueAgentProcessing(event.eventId);

      await createAuditEntry({
        eventId: event.eventId,
        type: 'scheduler_retry',
        message: `Failed event re-queued (attempt ${event.processingAttempts + 1})`,
      });
    } catch (e) {
      logger.warn('Failed to retry event', { eventId: event.eventId, error: e.message });
    }
  }
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Scheduler stopped');
  }
}
