import { AuditLog, SupportEvent, Approval, ActionExecution } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getRedisConnection } from '../config/redis.js';
import mongoose from 'mongoose';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { eventId, type, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (eventId) filter.eventId = eventId;
  if (type) filter.type = type;

  const logs = await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10))
    .lean();

  const total = await AuditLog.countDocuments(filter);

  res.json({ success: true, logs, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
});

export const getActivity = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;

  const logs = await AuditLog.find()
    .sort({ timestamp: -1 })
    .limit(parseInt(limit, 10))
    .lean();

  res.json({ success: true, activity: logs });
});

export const getHealth = asyncHandler(async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  let redisStatus = 'disconnected';
  try {
    const redis = getRedisConnection();
    await redis.ping();
    redisStatus = 'connected';
  } catch { /* ignored */ }

  const eventCounts = await SupportEvent.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const pendingApprovals = await Approval.countDocuments({ status: 'PENDING' });

  res.json({
    success: true,
    health: {
      status: mongoStatus === 'connected' && redisStatus === 'connected' ? 'healthy' : 'degraded',
      mongodb: mongoStatus,
      redis: redisStatus,
      uptime: process.uptime(),
      eventCounts: eventCounts.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {}),
      pendingApprovals,
    },
  });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [eventCounts, pendingApprovals, recentActions, recentActivity] = await Promise.all([
    SupportEvent.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Approval.countDocuments({ status: 'PENDING' }),
    ActionExecution.find().sort({ createdAt: -1 }).limit(10).lean(),
    AuditLog.find().sort({ timestamp: -1 }).limit(20).lean(),
  ]);

  const totalEvents = eventCounts.reduce((sum, { count }) => sum + count, 0);
  const statusMap = eventCounts.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {});

  res.json({
    success: true,
    stats: {
      totalEvents,
      received: statusMap.RECEIVED || 0,
      processing: (statusMap.INVESTIGATING || 0) + (statusMap.DECIDING || 0) + (statusMap.QUEUED || 0),
      autoExecuted: statusMap.COMPLETED || 0,
      pendingApproval: statusMap.PENDING_APPROVAL || 0,
      rejected: statusMap.REJECTED || 0,
      failed: statusMap.FAILED || 0,
      expired: statusMap.EXPIRED || 0,
      pendingApprovals,
      recentActions,
      recentActivity,
    },
  });
});
