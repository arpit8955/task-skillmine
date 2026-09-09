import { Router } from 'express';
import { createEvent, getEvents, getEventById } from '../controllers/eventController.js';
import { getApprovals, getApprovalById, approve, reject } from '../controllers/approvalController.js';
import { getAuditLogs, getActivity, getHealth, getDashboardStats } from '../controllers/systemController.js';
import { validateEvent, validateApprovalAction } from '../validators/index.js';

const router = Router();

router.post('/events', validateEvent, createEvent);
router.get('/events', getEvents);
router.get('/events/:id', getEventById);

router.get('/approvals', getApprovals);
router.get('/approvals/:id', getApprovalById);
router.post('/approvals/:id/approve', validateApprovalAction, approve);
router.post('/approvals/:id/reject', validateApprovalAction, reject);

router.get('/audit', getAuditLogs);
router.get('/activity', getActivity);
router.get('/health', getHealth);
router.get('/dashboard', getDashboardStats);

export default router;
