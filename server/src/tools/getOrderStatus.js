import { Order } from '../models/index.js';

export const definition = {
  type: 'function',
  function: {
    name: 'get_order_status',
    description: 'Retrieve order details including status, shipping information, payment status, and expected delivery date. Use this to check order fulfillment and shipping progress.',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order ID to look up',
        },
      },
      required: ['orderId'],
    },
  },
};

export async function execute({ orderId }) {
  if (!orderId || typeof orderId !== 'string') {
    throw new Error('Valid orderId is required');
  }

  const order = await Order.findOne({ orderId }).lean();
  if (!order) {
    return { found: false, orderId, message: 'Order not found' };
  }

  return {
    found: true,
    orderId: order.orderId,
    customerId: order.customerId,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    items: order.items,
    shippingStatus: order.shippingStatus,
    expectedDeliveryDate: order.expectedDeliveryDate,
    trackingNumber: order.trackingNumber,
    paymentStatus: order.paymentStatus,
  };
}
