import { Customer } from '../models/index.js';

export const definition = {
  type: 'function',
  function: {
    name: 'get_customer_details',
    description: 'Retrieve customer information including account status, email, and order history. Use this to understand who the customer is and their relationship with us.',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'The customer ID to look up',
        },
      },
      required: ['customerId'],
    },
  },
};

export async function execute({ customerId }) {
  if (!customerId || typeof customerId !== 'string') {
    throw new Error('Valid customerId is required');
  }

  const customer = await Customer.findOne({ customerId }).lean();
  if (!customer) {
    return { found: false, customerId, message: 'Customer not found' };
  }

  return {
    found: true,
    customerId: customer.customerId,
    name: customer.name,
    email: customer.email,
    accountStatus: customer.accountStatus,
    orderCount: customer.orderIds.length,
    orderIds: customer.orderIds,
    supportHistoryCount: customer.previousSupportHistory.length,
  };
}
