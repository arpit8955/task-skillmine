import { SupportEvent, EVENT_STATES, AgentRun, ToolCallLog, ActionExecution, Approval } from '../models/index.js';
import { transitionEventState, createAuditEntry } from '../services/eventStateService.js';
import { enqueueAgentProcessing } from '../queues/index.js';
import { emitActivity } from '../sockets/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

export const createEvent = asyncHandler(async (req, res) => {
  const { eventId, type, customerId, message } = req.body;

  const existing = await SupportEvent.findOne({ eventId });
  if (existing) {
    return res.status(409).json({
      success: false,
      error: `Event ${eventId} already exists`,
      event: existing,
    });
  }

  const event = await SupportEvent.create({
    eventId,
    type: type || 'support_ticket',
    customerId,
    message,
    status: EVENT_STATES.RECEIVED,
    statusHistory: [{ to: EVENT_STATES.RECEIVED, reason: 'Event received via API' }],
  });

  emitActivity('agent:event_received', {
    eventId,
    customerId,
    type: type || 'support_ticket',
    message: message.substring(0, 100),
    timestamp: new Date(),
  });

  await createAuditEntry({
    eventId,
    type: 'event_received',
    message: `Support event received from customer ${customerId}`,
    metadata: { type: type || 'support_ticket' },
  });

  await transitionEventState(eventId, EVENT_STATES.QUEUED, { reason: 'Enqueued for processing' });
  await enqueueAgentProcessing(eventId);

  logger.info('Event created and enqueued', { eventId, customerId });

  res.status(201).json({ success: true, event });
});

export const getEvents = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const events = await SupportEvent.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10))
    .lean();

  const total = await SupportEvent.countDocuments(filter);

  res.json({ success: true, events, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
});

export const getEventById = asyncHandler(async (req, res) => {
  const event = await SupportEvent.findOne({ eventId: req.params.id }).lean();
  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  const agentRun = await AgentRun.findOne({ eventId: req.params.id })
    .sort({ createdAt: -1 })
    .lean();

  const toolCalls = await ToolCallLog.find({ eventId: req.params.id })
    .sort({ startedAt: 1 })
    .lean();

  const actionExecution = await ActionExecution.findOne({ eventId: req.params.id }).lean();
  const approval = await Approval.findOne({ eventId: req.params.id }).lean();

  res.json({
    success: true,
    event,
    agentRun,
    toolCalls,
    actionExecution,
    approval,
  });
});
