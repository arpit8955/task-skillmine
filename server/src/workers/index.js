import { Worker } from 'bullmq';
import { createNewRedisConnection, isRedisConnected } from '../config/redis.js';
import { SupportEvent, EVENT_STATES } from '../models/index.js';
import { investigateEvent } from '../services/agentService.js';
import { evaluateRisk } from '../policies/riskPolicyService.js';
import { executeAction } from '../services/actionExecutionService.js';
import { createApproval } from '../services/approvalService.js';
import { transitionEventState, createAuditEntry } from '../services/eventStateService.js';
import { emitActivity } from '../sockets/index.js';
import logger from '../utils/logger.js';

let agentWorker = null;
let actionWorker = null;

export function startWorkers() {
  try {
    const conn = createNewRedisConnection();
    conn.connect().then(() => {
      agentWorker = new Worker('agent-processing', processAgentJob, {
        connection: conn,
        concurrency: 2,
      });

      agentWorker.on('completed', (job) => {
        logger.info('Agent job completed', { jobId: job.id, eventId: job.data.eventId });
      });

      agentWorker.on('failed', (job, err) => {
        logger.error('Agent job failed', { jobId: job?.id, eventId: job?.data?.eventId, error: err.message });
        handleJobFailure(job, err);
      });

      actionWorker = new Worker('action-execution', processActionJob, {
        connection: createNewRedisConnection(),
        concurrency: 2,
      });

      actionWorker.on('completed', (job) => {
        logger.info('Action job completed', { jobId: job.id, eventId: job.data.eventId });
      });

      actionWorker.on('failed', (job, err) => {
        logger.error('Action job failed', { jobId: job?.id, error: err.message });
      });

      logger.info('BullMQ workers started successfully');
    }).catch(() => {
      logger.info('Redis not running; workers operating via direct in-process async pipeline');
    });
  } catch (err) {
    logger.warn('Could not initialize BullMQ workers; operating in direct async mode', { error: err.message });
  }
}

export async function processAgentJob(job) {
  const { eventId } = job.data;
  const attempt = (job.attemptsMade || 0) + 1;
  await processAgentJobDirect(eventId, attempt);
}

export async function processAgentJobDirect(eventId, attempt = 1) {
  logger.info('Processing agent job', { eventId, attempt });

  const event = await SupportEvent.findOne({ eventId });
  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  if (event.status === EVENT_STATES.COMPLETED || event.status === EVENT_STATES.REJECTED) {
    logger.info('Event already in terminal state, skipping', { eventId, status: event.status });
    return;
  }

  await SupportEvent.updateOne({ eventId }, { $inc: { processingAttempts: 1 } });

  try {
    await transitionEventState(eventId, EVENT_STATES.INVESTIGATING, {
      reason: `Investigation started (attempt ${attempt})`,
    });
  } catch (transitionError) {
    logger.warn('State transition failed, event may already be processing', { eventId, error: transitionError.message });
    return;
  }

  emitActivity('agent:event_processing', {
    eventId,
    attempt,
    timestamp: new Date(),
  });

  const { agentRunId, decision } = await investigateEvent(event);

  await transitionEventState(eventId, EVENT_STATES.DECIDING, { reason: 'Agent decision ready' });
  await SupportEvent.updateOne({ eventId }, {
    agentRunId,
    riskClassification: decision.risk.level,
  });

  const riskEvaluation = evaluateRisk(decision);

  emitActivity('agent:risk_evaluated', {
    eventId,
    agentRunId,
    riskLevel: decision.risk.level,
    confidence: decision.risk.confidence,
    allowed: riskEvaluation.allowed,
    reasons: riskEvaluation.reasons,
    timestamp: new Date(),
  });

  await createAuditEntry({
    eventId,
    agentRunId,
    type: 'risk_evaluated',
    message: `Risk evaluation: ${riskEvaluation.allowed ? 'AUTO-EXECUTE' : 'REQUIRES APPROVAL'}`,
    metadata: {
      riskLevel: decision.risk.level,
      confidence: decision.risk.confidence,
      allowed: riskEvaluation.allowed,
      reasons: riskEvaluation.reasons,
    },
  });

  if (riskEvaluation.allowed && !riskEvaluation.requiresApproval) {
    await transitionEventState(eventId, EVENT_STATES.EXECUTING, { reason: 'Low-risk auto-execution' });
    await SupportEvent.updateOne({ eventId }, { actionStatus: 'auto_executing' });

    const result = await executeAction(eventId, decision.proposedAction.type, decision.proposedAction.payload);

    if (!result.duplicate) {
      await transitionEventState(eventId, EVENT_STATES.COMPLETED, { reason: 'Action auto-executed successfully' });
      await SupportEvent.updateOne({ eventId }, { actionStatus: 'completed' });
    }
  } else {
    await transitionEventState(eventId, EVENT_STATES.PENDING_APPROVAL, { reason: 'Gated by human veto policy' });
    await SupportEvent.updateOne({ eventId }, { actionStatus: 'pending_approval' });
    await createApproval(eventId, agentRunId, decision);
  }
}

export async function processActionJob(job) {
  const { eventId, actionType, payload } = job.data;
  logger.info('Processing action job', { eventId, actionType });
  await executeAction(eventId, actionType, payload);
}

export async function processActionJobDirect(eventId, actionType, payload) {
  logger.info('Processing action job direct', { eventId, actionType });
  return executeAction(eventId, actionType, payload);
}

async function handleJobFailure(job, error) {
  if (!job?.data?.eventId) return;

  const { eventId } = job.data;
  const isRetryable = job.attemptsMade < (job.opts?.attempts || 3);

  if (!isRetryable) {
    try {
      emitActivity('agent:failed_safe', {
        eventId,
        reason: `Max retries reached: ${error.message}`,
        timestamp: new Date(),
      });

      const event = await SupportEvent.findOne({ eventId });
      if (event && !['COMPLETED', 'REJECTED', 'FAILED', 'PENDING_APPROVAL'].includes(event.status)) {
        await transitionEventState(eventId, EVENT_STATES.FAILED, {
          reason: `Processing failed after max retries: ${error.message}`,
        });
      }
    } catch (e) {
      logger.error('Failed to handle job failure', { eventId, error: e.message });
    }
  } else {
    emitActivity('agent:retrying', {
      eventId,
      attempt: job.attemptsMade + 1,
      reason: error.message,
      timestamp: new Date(),
    });
  }
}

export async function stopWorkers() {
  if (agentWorker) {
    try { await agentWorker.close(); } catch {}
  }
  if (actionWorker) {
    try { await actionWorker.close(); } catch {}
  }
}
