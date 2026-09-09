import mongoose from 'mongoose';

const toolCallLogSchema = new mongoose.Schema({
  eventId: { type: String, required: true, index: true },
  agentRunId: { type: String, required: true, index: true },
  toolName: { type: String, required: true },
  input: { type: mongoose.Schema.Types.Mixed, required: true },
  output: mongoose.Schema.Types.Mixed,
  startedAt: { type: Date, required: true },
  completedAt: Date,
  durationMs: Number,
  status: {
    type: String,
    enum: ['started', 'completed', 'failed'],
    default: 'started',
  },
  error: String,
  attempt: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model('ToolCallLog', toolCallLogSchema);
