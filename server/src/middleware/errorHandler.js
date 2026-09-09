import logger from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(err.details && { details: err.details }),
  });
}

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
