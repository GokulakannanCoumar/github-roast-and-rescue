// src/middleware/errorHandler.js - Centralized application error handling

function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `API endpoint ${req.method} ${req.path} not found.`
    });
  }
  next();
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  const isOperational = statusCode >= 400 && statusCode < 500;
  const response = {
    success: false,
    error: isOperational
      ? (err.message || 'Request could not be completed.')
      : 'Internal server error occurred.'
  };

  if (err.code === 'GITHUB_RATE_LIMIT' && err.resetAt) {
    response.retryAt = err.resetAt;
  }

  if (process.env.NODE_ENV === 'development') {
    response.debug = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
