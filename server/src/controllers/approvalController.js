import { Approval } from '../models/index.js';
import { approveAction, rejectAction } from '../services/approvalService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getApprovals = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const approvals = await Approval.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10))
    .lean();

  const total = await Approval.countDocuments(filter);

  res.json({ success: true, approvals, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
});

export const getApprovalById = asyncHandler(async (req, res) => {
  const approval = await Approval.findOne({ approvalId: req.params.id }).lean();
  if (!approval) {
    return res.status(404).json({ success: false, error: 'Approval not found' });
  }
  res.json({ success: true, approval });
});

export const approve = asyncHandler(async (req, res) => {
  const { reviewer } = req.body;
  const result = await approveAction(req.params.id, reviewer);
  res.json({ success: true, ...result });
});

export const reject = asyncHandler(async (req, res) => {
  const { reviewer, rejectionReason } = req.body;
  const approval = await rejectAction(req.params.id, reviewer, rejectionReason);
  res.json({ success: true, approval });
});
