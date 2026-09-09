import { v4 as uuidv4 } from 'uuid';
import { Approval, SupportEvent } from '../models/index.js';
import { executeAction } from './actionExecutionService.js';
import { transitionEventState, createAuditEntry } from './eventStateService.js';
import { EVENT_STATES } from '../models/SupportEvent.js';
import { emitActivity } from '../sockets/index.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

export async function createApproval(eventId, agentRunId, decision) {
  const approvalId = `APR-${uuidv4().substring(0, 8)}`;
  const expiresAt = new Date(Date.now() + config.agent.approvalExpiryMinutes * 60 * 1000);

  const approval = await Approval.create({
    approvalId,
    eventId,
    agentRunId,
    proposedAction: decision.proposedAction,
    risk: decision.risk,
    evidence: decision.evidence,
    reasoningSummary: decision.reasoningSummary,
    toolCallRefs: [],
    status: 'PENDING',
    expiresAt,
  });

  await transitionEventState(eventId, EVENT_STATES.PENDING_APPROVAL, {
    reason: `Approval required: ${decision.risk.reason}`,
  });

  emitActivity('agent:approval_required', {
    eventId,
    approvalId,
    actionType: decision.proposedAction.type,
    riskLevel: decision.risk.level,
    confidence: decision.risk.confidence,
    timestamp: new Date(),
  });

  await createAuditEntry({
    eventId,
    agentRunId,
    type: 'approval_created',
    message: `Approval created for action: ${decision.proposedAction.type}`,
    metadata: { approvalId, expiresAt },
  });

  return approval;
}

export async function approveAction(approvalId, reviewer) {
  const approval = await Approval.findOneAndUpdate(
    { approvalId, status: 'PENDING' },
    {
      $set: {
        status: 'APPROVED',
        reviewer: reviewer || 'admin',
        reviewedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!approval) {
    const existing = await Approval.findOne({ approvalId });
    if (!existing) throw new Error('Approval not found');
    throw new Error(`Approval is already ${existing.status}`);
  }

  emitActivity('agent:approval_updated', {
    eventId: approval.eventId,
    approvalId,
    status: 'APPROVED',
    reviewer: reviewer || 'admin',
    timestamp: new Date(),
  });

  await createAuditEntry({
    eventId: approval.eventId,
    type: 'approval_approved',
    message: `Approval ${approvalId} approved by ${reviewer || 'admin'}`,
    actor: reviewer || 'admin',
  });

  await transitionEventState(approval.eventId, EVENT_STATES.EXECUTING, {
    reason: 'Approved by human reviewer',
    actor: reviewer || 'admin',
  });

  const result = await executeAction(
    approval.eventId,
    approval.proposedAction.type,
    approval.proposedAction.payload
  );

  if (!result.duplicate) {
    await Approval.updateOne({ approvalId }, { status: 'EXECUTED' });

    await transitionEventState(approval.eventId, EVENT_STATES.COMPLETED, {
      reason: 'Approved action executed successfully',
      actor: reviewer || 'admin',
    });
  }

  return { approval, executionResult: result };
}

export async function rejectAction(approvalId, reviewer, rejectionReason) {
  const approval = await Approval.findOneAndUpdate(
    { approvalId, status: 'PENDING' },
    {
      $set: {
        status: 'REJECTED',
        reviewer: reviewer || 'admin',
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || 'Rejected by reviewer',
      },
    },
    { new: true }
  );

  if (!approval) {
    const existing = await Approval.findOne({ approvalId });
    if (!existing) throw new Error('Approval not found');
    throw new Error(`Approval is already ${existing.status}`);
  }

  await transitionEventState(approval.eventId, EVENT_STATES.REJECTED, {
    reason: rejectionReason || 'Rejected by reviewer',
    actor: reviewer || 'admin',
  });

  emitActivity('agent:approval_updated', {
    eventId: approval.eventId,
    approvalId,
    status: 'REJECTED',
    reviewer: reviewer || 'admin',
    timestamp: new Date(),
  });

  await createAuditEntry({
    eventId: approval.eventId,
    type: 'approval_rejected',
    message: `Approval ${approvalId} rejected: ${rejectionReason || 'No reason provided'}`,
    actor: reviewer || 'admin',
    metadata: { rejectionReason },
  });

  return approval;
}

export async function expireApprovals() {
  const expired = await Approval.find({
    status: 'PENDING',
    expiresAt: { $lte: new Date() },
  });

  for (const approval of expired) {
    await Approval.updateOne(
      { _id: approval._id, status: 'PENDING' },
      { $set: { status: 'EXPIRED' } }
    );

    try {
      await transitionEventState(approval.eventId, EVENT_STATES.EXPIRED, {
        reason: 'Approval expired',
      });
    } catch (err) {
      logger.warn('Failed to transition expired event', { eventId: approval.eventId, error: err.message });
    }

    await createAuditEntry({
      eventId: approval.eventId,
      type: 'approval_expired',
      message: `Approval ${approval.approvalId} expired`,
    });

    emitActivity('agent:approval_updated', {
      eventId: approval.eventId,
      approvalId: approval.approvalId,
      status: 'EXPIRED',
      timestamp: new Date(),
    });
  }

  return expired.length;
}
