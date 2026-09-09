import mongoose from 'mongoose';

export const EVENT_STATES = {
  RECEIVED: 'RECEIVED',
  QUEUED: 'QUEUED',
  INVESTIGATING: 'INVESTIGATING',
  DECIDING: 'DECIDING',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  EXECUTING: 'EXECUTING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
};

export const VALID_TRANSITIONS = {
  [EVENT_STATES.RECEIVED]: [EVENT_STATES.QUEUED, EVENT_STATES.FAILED],
  [EVENT_STATES.QUEUED]: [EVENT_STATES.INVESTIGATING, EVENT_STATES.FAILED],
  [EVENT_STATES.INVESTIGATING]: [EVENT_STATES.DECIDING, EVENT_STATES.FAILED, EVENT_STATES.QUEUED],
  [EVENT_STATES.DECIDING]: [EVENT_STATES.EXECUTING, EVENT_STATES.PENDING_APPROVAL, EVENT_STATES.FAILED, EVENT_STATES.QUEUED],
  [EVENT_STATES.PENDING_APPROVAL]: [EVENT_STATES.EXECUTING, EVENT_STATES.REJECTED, EVENT_STATES.EXPIRED, EVENT_STATES.FAILED],
  [EVENT_STATES.EXECUTING]: [EVENT_STATES.COMPLETED, EVENT_STATES.FAILED],
  [EVENT_STATES.COMPLETED]: [],
  [EVENT_STATES.REJECTED]: [],
  [EVENT_STATES.FAILED]: [EVENT_STATES.QUEUED],
  [EVENT_STATES.EXPIRED]: [],
};

const statusHistorySchema = new mongoose.Schema({
  from: String,
  to: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  reason: String,
  actor: String,
}, { _id: false });

const supportEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true, default: 'support_ticket' },
  customerId: { type: String, required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(EVENT_STATES),
    default: EVENT_STATES.RECEIVED,
    index: true,
  },
  processingAttempts: { type: Number, default: 0 },
  agentRunId: String,
  riskClassification: String,
  actionStatus: String,
  statusHistory: [statusHistorySchema],
  lastProcessedAt: Date,
}, { timestamps: true });

supportEventSchema.index({ createdAt: -1 });
supportEventSchema.index({ status: 1, lastProcessedAt: 1 });

export function isValidTransition(currentState, nextState) {
  const allowed = VALID_TRANSITIONS[currentState];
  return allowed && allowed.includes(nextState);
}

export default mongoose.model('SupportEvent', supportEventSchema);
