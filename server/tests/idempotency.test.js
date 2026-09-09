import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { ActionExecution } from '../src/models/index.js';

vi.mock('../src/sockets/index.js', () => ({
  emitActivity: vi.fn(),
}));

describe('Idempotency and Concurrency', () => {
  describe('ActionExecution idempotency key', () => {
    it('should prevent duplicate action execution via unique index', async () => {
      const first = await ActionExecution.create({
        idempotencyKey: 'EVENT-1:send_response',
        eventId: 'EVENT-1',
        actionType: 'send_response',
        status: 'completed',
        attemptCount: 1,
      });

      expect(first).toBeDefined();

      let error;
      try {
        await ActionExecution.create({
          idempotencyKey: 'EVENT-1:send_response',
          eventId: 'EVENT-1',
          actionType: 'send_response',
          status: 'pending',
          attemptCount: 1,
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000);
    });

    it('should allow different events to use the same action type', async () => {
      await ActionExecution.create({
        idempotencyKey: 'EVENT-A:send_response',
        eventId: 'EVENT-A',
        actionType: 'send_response',
        status: 'completed',
        attemptCount: 1,
      });

      const second = await ActionExecution.create({
        idempotencyKey: 'EVENT-B:send_response',
        eventId: 'EVENT-B',
        actionType: 'send_response',
        status: 'pending',
        attemptCount: 1,
      });

      expect(second).toBeDefined();
    });
  });

  describe('Concurrent execution protection', () => {
    it('should allow only one worker to claim a pending action via atomic update', async () => {
      const execution = await ActionExecution.create({
        idempotencyKey: 'EVENT-RACE:send_response',
        eventId: 'EVENT-RACE',
        actionType: 'send_response',
        status: 'pending',
        attemptCount: 0,
      });

      const results = await Promise.all([
        ActionExecution.findOneAndUpdate(
          { _id: execution._id, status: 'pending' },
          { $set: { status: 'running' } },
          { new: true }
        ),
        ActionExecution.findOneAndUpdate(
          { _id: execution._id, status: 'pending' },
          { $set: { status: 'running' } },
          { new: true }
        ),
      ]);

      const claimed = results.filter(Boolean);
      expect(claimed.length).toBe(1);
      expect(claimed[0].status).toBe('running');
    });

    it('should prevent re-execution of already completed action', async () => {
      await ActionExecution.create({
        idempotencyKey: 'EVENT-DONE:apply_refund',
        eventId: 'EVENT-DONE',
        actionType: 'apply_refund',
        status: 'completed',
        attemptCount: 1,
      });

      let duplicateError;
      try {
        await ActionExecution.create({
          idempotencyKey: 'EVENT-DONE:apply_refund',
          eventId: 'EVENT-DONE',
          actionType: 'apply_refund',
          status: 'pending',
          attemptCount: 1,
        });
      } catch (e) {
        duplicateError = e;
      }

      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe(11000);
    });
  });
});
