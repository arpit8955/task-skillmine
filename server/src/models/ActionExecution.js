import mongoose from 'mongoose';

const actionExecutionSchema = new mongoose.Schema({
  idempotencyKey: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  actionType: { type: String, required: true },
  payload: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  startedAt: Date,
  completedAt: Date,
  result: mongoose.Schema.Types.Mixed,
  error: String,
  attemptCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('ActionExecution', actionExecutionSchema);
