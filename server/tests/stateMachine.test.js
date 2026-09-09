import { describe, it, expect, vi } from 'vitest';
import { SupportEvent, EVENT_STATES, isValidTransition, Approval } from '../src/models/index.js';

vi.mock('../src/sockets/index.js', () => ({
  emitActivity: vi.fn(),
}));

describe('Event State Machine', () => {
  describe('Valid transitions', () => {
    it('should allow RECEIVED -> QUEUED', () => {
      expect(isValidTransition('RECEIVED', 'QUEUED')).toBe(true);
    });

    it('should allow QUEUED -> INVESTIGATING', () => {
      expect(isValidTransition('QUEUED', 'INVESTIGATING')).toBe(true);
    });

    it('should allow INVESTIGATING -> DECIDING', () => {
      expect(isValidTransition('INVESTIGATING', 'DECIDING')).toBe(true);
    });

    it('should allow DECIDING -> EXECUTING', () => {
      expect(isValidTransition('DECIDING', 'EXECUTING')).toBe(true);
    });

    it('should allow DECIDING -> PENDING_APPROVAL', () => {
      expect(isValidTransition('DECIDING', 'PENDING_APPROVAL')).toBe(true);
    });

    it('should allow EXECUTING -> COMPLETED', () => {
      expect(isValidTransition('EXECUTING', 'COMPLETED')).toBe(true);
    });

    it('should allow PENDING_APPROVAL -> EXECUTING', () => {
      expect(isValidTransition('PENDING_APPROVAL', 'EXECUTING')).toBe(true);
    });

    it('should allow PENDING_APPROVAL -> REJECTED', () => {
      expect(isValidTransition('PENDING_APPROVAL', 'REJECTED')).toBe(true);
    });

    it('should allow FAILED -> QUEUED for retry', () => {
      expect(isValidTransition('FAILED', 'QUEUED')).toBe(true);
    });
  });

  describe('Invalid transitions', () => {
    it('should not allow COMPLETED -> any state', () => {
      expect(isValidTransition('COMPLETED', 'QUEUED')).toBe(false);
      expect(isValidTransition('COMPLETED', 'INVESTIGATING')).toBe(false);
    });

    it('should not allow REJECTED -> any state', () => {
      expect(isValidTransition('REJECTED', 'QUEUED')).toBe(false);
      expect(isValidTransition('REJECTED', 'EXECUTING')).toBe(false);
    });

    it('should not allow RECEIVED -> EXECUTING', () => {
      expect(isValidTransition('RECEIVED', 'EXECUTING')).toBe(false);
    });

    it('should not allow QUEUED -> COMPLETED', () => {
      expect(isValidTransition('QUEUED', 'COMPLETED')).toBe(false);
    });
  });
});

describe('SupportEvent Model', () => {
  it('should enforce unique eventId', async () => {
    await SupportEvent.create({
      eventId: 'UNIQUE-1',
      type: 'support_ticket',
      customerId: 'CUS-1',
      message: 'Test',
      status: EVENT_STATES.RECEIVED,
      statusHistory: [{ to: EVENT_STATES.RECEIVED }],
    });

    let error;
    try {
      await SupportEvent.create({
        eventId: 'UNIQUE-1',
        type: 'support_ticket',
        customerId: 'CUS-2',
        message: 'Duplicate',
        status: EVENT_STATES.RECEIVED,
        statusHistory: [{ to: EVENT_STATES.RECEIVED }],
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000);
  });
});

describe('Approval Model', () => {
  it('should create approval with PENDING status', async () => {
    const approval = await Approval.create({
      approvalId: 'APR-TEST-1',
      eventId: 'EVT-1',
      proposedAction: { type: 'apply_refund', payload: { amount: 50000 } },
      risk: { level: 'HIGH', confidence: 0.9 },
      evidence: [{ tool: 'get_order_status', finding: 'Found' }],
      expiresAt: new Date(Date.now() + 3600000),
    });
    expect(approval.status).toBe('PENDING');
  });

  it('should atomically transition approval from PENDING to APPROVED', async () => {
    await Approval.create({
      approvalId: 'APR-ATOMIC-1',
      eventId: 'EVT-2',
      proposedAction: { type: 'apply_refund', payload: {} },
      risk: { level: 'HIGH', confidence: 0.9 },
      evidence: [],
      expiresAt: new Date(Date.now() + 3600000),
    });

    const results = await Promise.all([
      Approval.findOneAndUpdate(
        { approvalId: 'APR-ATOMIC-1', status: 'PENDING' },
        { $set: { status: 'APPROVED' } },
        { new: true }
      ),
      Approval.findOneAndUpdate(
        { approvalId: 'APR-ATOMIC-1', status: 'PENDING' },
        { $set: { status: 'APPROVED' } },
        { new: true }
      ),
    ]);

    const succeeded = results.filter(Boolean);
    expect(succeeded.length).toBe(1);
  });

  it('should not allow approving an already rejected approval', async () => {
    await Approval.create({
      approvalId: 'APR-REJECTED-1',
      eventId: 'EVT-3',
      proposedAction: { type: 'apply_refund', payload: {} },
      risk: { level: 'HIGH', confidence: 0.9 },
      evidence: [],
      status: 'REJECTED',
      expiresAt: new Date(Date.now() + 3600000),
    });

    const result = await Approval.findOneAndUpdate(
      { approvalId: 'APR-REJECTED-1', status: 'PENDING' },
      { $set: { status: 'APPROVED' } },
      { new: true }
    );

    expect(result).toBeNull();
  });
});
