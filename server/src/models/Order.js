import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending',
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  items: [{
    name: String,
    quantity: Number,
    price: Number,
  }],
  shippingStatus: {
    type: String,
    enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned'],
    default: 'pending',
  },
  expectedDeliveryDate: Date,
  trackingNumber: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'partially_refunded', 'failed'],
    default: 'paid',
  },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
