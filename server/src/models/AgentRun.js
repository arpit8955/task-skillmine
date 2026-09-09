import mongoose from 'mongoose';

const agentRunSchema = new mongoose.Schema({
  agentRunId: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['started', 'investigating', 'deciding', 'completed', 'failed'],
    default: 'started',
  },
  toolCalls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ToolCallLog' }],
  decision: {
    intent: String,
    proposedAction: mongoose.Schema.Types.Mixed,
    risk: {
      level: String,
      confidence: Number,
      reversible: Boolean,
      reason: String,
    },
    evidence: [{ tool: String, finding: String }],
    requiresHumanApproval: Boolean,
    reasoningSummary: String,
  },
  attempt: { type: Number, default: 1 },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  durationMs: Number,
  error: String,
}, { timestamps: true });

export default mongoose.model('AgentRun', agentRunSchema);
