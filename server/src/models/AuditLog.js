import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  eventId: String,
  agentRunId: String,
  type: { type: String, required: true, index: true },
  message: String,
  metadata: mongoose.Schema.Types.Mixed,
  actor: { type: String, default: 'system' },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

auditLogSchema.index({ eventId: 1, timestamp: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
