import { Customer } from '../models/index.js';

export const definition = {
  type: 'function',
  function: {
    name: 'get_customer_support_history',
    description: 'Retrieve the full support ticket history for a customer. Use this to check for patterns like repeated complaints, previous refunds, or escalation history.',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'The customer ID to look up support history for',
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
    return { found: false, customerId, history: [], message: 'Customer not found' };
  }

  return {
    found: true,
    customerId: customer.customerId,
    totalTickets: customer.previousSupportHistory.length,
    history: customer.previousSupportHistory.map(h => ({
      ticketId: h.ticketId,
      date: h.date,
      issue: h.issue,
      resolution: h.resolution,
      satisfaction: h.satisfaction,
    })),
  };
}
