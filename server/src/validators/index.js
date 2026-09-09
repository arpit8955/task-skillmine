import { body, param, validationResult } from 'express-validator';

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

export const validateEvent = [
  body('eventId').trim().notEmpty().withMessage('eventId is required'),
  body('type').optional().trim().isString(),
  body('customerId').trim().notEmpty().withMessage('customerId is required'),
  body('message').trim().notEmpty().withMessage('message is required')
    .isLength({ max: 5000 }).withMessage('message must be at most 5000 characters'),
  handleValidationErrors,
];

export const validateApprovalAction = [
  param('id').trim().notEmpty().withMessage('approval id is required'),
  body('reviewer').optional().trim().isString(),
  body('rejectionReason').optional().trim().isString()
    .isLength({ max: 1000 }).withMessage('rejection reason must be at most 1000 characters'),
  handleValidationErrors,
];
