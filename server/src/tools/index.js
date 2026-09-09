import * as getCustomerDetails from './getCustomerDetails.js';
import * as getOrderStatus from './getOrderStatus.js';
import * as searchKnowledgeBase from './searchKnowledgeBase.js';
import * as getCustomerSupportHistory from './getCustomerSupportHistory.js';

export const toolRegistry = {
  get_customer_details: getCustomerDetails,
  get_order_status: getOrderStatus,
  search_knowledge_base: searchKnowledgeBase,
  get_customer_support_history: getCustomerSupportHistory,
};

export const toolDefinitions = Object.values(toolRegistry).map(t => t.definition);

export function getToolExecutor(toolName) {
  const tool = toolRegistry[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return tool.execute;
}
