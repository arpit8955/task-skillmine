import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema({
  approvalId: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  agentRunId: String,
  proposedAction: {
    type: { type: String, required: true },
    payload: mongoose.Schema.Types.Mixed,
  },
  risk: {
    level: String,
    confidence: Number,
    reversible: Boolean,
    reason: String,
  },
  evidence: [{ tool: String, finding: String }],
  reasoningSummary: String,
  toolCallRefs: [String],
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED'],
    default: 'PENDING',
    index: true,
  },
  reviewer: String,
  reviewedAt: Date,
  rejectionReason: String,
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

export default mongoose.model('Approval', approvalSchema);
