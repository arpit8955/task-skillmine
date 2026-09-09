import { SupportEvent, isValidTransition, AuditLog } from '../models/index.js';
import logger from '../utils/logger.js';
import { emitActivity } from '../sockets/index.js';

export async function transitionEventState(eventId, nextState, { reason, actor } = {}) {
  const event = await SupportEvent.findOne({ eventId });
  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const currentState = event.status;
  if (!isValidTransition(currentState, nextState)) {
    throw new Error(`Invalid transition from ${currentState} to ${nextState} for event ${eventId}`);
  }

  event.status = nextState;
  event.statusHistory.push({
    from: currentState,
    to: nextState,
    timestamp: new Date(),
    reason: reason || `Transition to ${nextState}`,
    actor: actor || 'system',
  });
  event.lastProcessedAt = new Date();
  await event.save();

  await createAuditEntry({
    eventId,
    type: 'state_transition',
    message: `Event transitioned from ${currentState} to ${nextState}`,
    metadata: { from: currentState, to: nextState, reason },
    actor: actor || 'system',
  });

  emitActivity('agent:state_changed', {
    eventId,
    from: currentState,
    to: nextState,
    timestamp: new Date(),
  });

  logger.info('Event state transitioned', { eventId, from: currentState, to: nextState });
  return event;
}

export async function createAuditEntry({ eventId, agentRunId, type, message, metadata, actor }) {
  const entry = await AuditLog.create({
    eventId,
    agentRunId,
    type,
    message,
    metadata,
    actor: actor || 'system',
    timestamp: new Date(),
  });

  emitActivity('agent:audit', {
    id: entry._id,
    eventId,
    type,
    message,
    timestamp: entry.timestamp,
  });

  return entry;
}
