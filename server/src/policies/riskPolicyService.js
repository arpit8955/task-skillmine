import config from '../config/index.js';
import logger from '../utils/logger.js';

const AUTO_EXECUTE_ACTIONS = new Set([
  'send_response',
  'provide_order_status',
  'provide_delivery_info',
  'provide_knowledge_info',
  'create_internal_note',
]);

const REQUIRES_APPROVAL_ACTIONS = new Set([
  'apply_refund',
  'cancel_order',
  'modify_account',
  'issue_credit',
  'escalate_to_manager',
  'apply_compensation',
]);

const FINANCIAL_ACTIONS = new Set([
  'apply_refund',
  'issue_credit',
  'apply_compensation',
]);

const IRREVERSIBLE_ACTIONS = new Set([
  'cancel_order',
  'apply_refund',
  'modify_account',
]);

export function evaluateRisk(agentDecision) {
  const result = {
    allowed: false,
    requiresApproval: true,
    reasons: [],
    overrideLevel: null,
  };

  if (!agentDecision || !agentDecision.proposedAction) {
    result.reasons.push('Missing or invalid agent decision');
    return result;
  }

  const { proposedAction, risk, evidence } = agentDecision;
  const actionType = proposedAction.type;

  if (!actionType) {
    result.reasons.push('No action type specified');
    return result;
  }

  if (!AUTO_EXECUTE_ACTIONS.has(actionType) && !REQUIRES_APPROVAL_ACTIONS.has(actionType)) {
    result.reasons.push(`Unknown action type: ${actionType}`);
    return result;
  }

  if (REQUIRES_APPROVAL_ACTIONS.has(actionType)) {
    result.reasons.push(`Action type "${actionType}" always requires human approval`);
    return result;
  }

  if (!risk || typeof risk.confidence !== 'number') {
    result.reasons.push('Missing risk assessment');
    return result;
  }

  if (risk.confidence < config.agent.confidenceThreshold) {
    result.reasons.push(`Confidence ${risk.confidence} below threshold ${config.agent.confidenceThreshold}`);
    return result;
  }

  if (risk.level && risk.level.toUpperCase() !== 'LOW') {
    result.reasons.push(`Risk level is ${risk.level}, not LOW`);
    return result;
  }

  if (risk.reversible === false) {
    result.reasons.push('Action is marked as irreversible');
    return result;
  }

  if (FINANCIAL_ACTIONS.has(actionType)) {
    result.reasons.push(`Financial action "${actionType}" requires approval regardless of risk`);
    return result;
  }

  if (IRREVERSIBLE_ACTIONS.has(actionType)) {
    result.reasons.push(`Irreversible action "${actionType}" requires approval`);
    return result;
  }

  if (!evidence || evidence.length < 2) {
    result.reasons.push('Insufficient evidence (minimum 2 tool findings required)');
    return result;
  }

  if (proposedAction.payload && proposedAction.payload.amount && proposedAction.payload.amount > 0) {
    result.reasons.push(`Action involves monetary amount: ${proposedAction.payload.amount}`);
    return result;
  }

  result.allowed = true;
  result.requiresApproval = false;
  result.reasons.push('Action meets all auto-execution criteria');

  logger.info('Risk policy evaluation', {
    actionType,
    riskLevel: risk.level,
    confidence: risk.confidence,
    allowed: result.allowed,
  });

  return result;
}

export function getAutoExecuteActions() {
  return [...AUTO_EXECUTE_ACTIONS];
}

export function getApprovalRequiredActions() {
  return [...REQUIRES_APPROVAL_ACTIONS];
}
