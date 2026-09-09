import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  accountStatus: { type: String, enum: ['active', 'suspended', 'closed'], default: 'active' },
  orderIds: [String],
  previousSupportHistory: [{
    ticketId: String,
    date: Date,
    issue: String,
    resolution: String,
    satisfaction: String,
  }],
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
