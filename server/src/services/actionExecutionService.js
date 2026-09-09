import { ActionExecution, SupportEvent } from '../models/index.js';
import { createAuditEntry } from './eventStateService.js';
import { emitActivity } from '../sockets/index.js';
import logger from '../utils/logger.js';

export async function executeAction(eventId, actionType, payload) {
  const idempotencyKey = `${eventId}:${actionType}`;

  let execution;
  try {
    execution = await ActionExecution.create({
      idempotencyKey,
      eventId,
      actionType,
      payload,
      status: 'pending',
      startedAt: new Date(),
      attemptCount: 1,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await ActionExecution.findOne({ idempotencyKey });
      logger.info('Duplicate action execution prevented', { idempotencyKey, existingStatus: existing?.status });
      return { duplicate: true, execution: existing };
    }
    throw error;
  }

  const claimed = await ActionExecution.findOneAndUpdate(
    { _id: execution._id, status: 'pending' },
    { $set: { status: 'running' } },
    { new: true }
  );

  if (!claimed) {
    logger.info('Action already claimed by another worker', { idempotencyKey });
    return { duplicate: true, execution };
  }

  emitActivity('agent:action_started', {
    eventId,
    actionType,
    timestamp: new Date(),
  });

  try {
    const result = await performAction(actionType, payload, eventId);

    const completedAt = new Date();
    await ActionExecution.updateOne(
      { _id: execution._id },
      {
        status: 'completed',
        completedAt,
        result,
      }
    );

    emitActivity('agent:action_completed', {
      eventId,
      actionType,
      status: 'completed',
      timestamp: completedAt,
    });

    await createAuditEntry({
      eventId,
      type: 'action_executed',
      message: `Action ${actionType} executed successfully`,
      metadata: { actionType, result },
    });

    return { duplicate: false, execution: { ...execution.toObject(), status: 'completed', result } };
  } catch (error) {
    await ActionExecution.updateOne(
      { _id: execution._id },
      {
        status: 'failed',
        completedAt: new Date(),
        error: error.message,
      }
    );

    emitActivity('agent:action_completed', {
      eventId,
      actionType,
      status: 'failed',
      error: error.message,
      timestamp: new Date(),
    });

    await createAuditEntry({
      eventId,
      type: 'action_failed',
      message: `Action ${actionType} failed: ${error.message}`,
      metadata: { actionType, error: error.message },
    });

    throw error;
  }
}

async function performAction(actionType, payload, eventId) {
  const handlers = {
    send_response: () => ({
      status: 'sent',
      message: payload.message,
      sentAt: new Date(),
      channel: 'email',
    }),
    provide_order_status: () => ({
      status: 'sent',
      message: payload.message,
      sentAt: new Date(),
    }),
    provide_delivery_info: () => ({
      status: 'sent',
      message: payload.message,
      sentAt: new Date(),
    }),
    provide_knowledge_info: () => ({
      status: 'sent',
      message: payload.message,
      sentAt: new Date(),
    }),
    create_internal_note: () => ({
      status: 'created',
      note: payload.message || payload.reason,
      createdAt: new Date(),
    }),
    apply_refund: () => ({
      status: 'processed',
      amount: payload.amount,
      refundId: `REF-${Date.now()}`,
      processedAt: new Date(),
    }),
    cancel_order: () => ({
      status: 'cancelled',
      orderId: payload.orderId,
      cancelledAt: new Date(),
    }),
    apply_compensation: () => ({
      status: 'processed',
      amount: payload.amount,
      compensationId: `COMP-${Date.now()}`,
      processedAt: new Date(),
    }),
    escalate_to_manager: () => ({
      status: 'escalated',
      escalatedAt: new Date(),
      reason: payload.reason,
    }),
  };

  const handler = handlers[actionType];
  if (!handler) {
    throw new Error(`Unknown action type: ${actionType}`);
  }

  return handler();
}
