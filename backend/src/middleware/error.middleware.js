const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Don't expose stack traces in production
  if (process.env.NODE_ENV !== 'production') {
    logger.error(err.stack);
  } else {
    logger.error(`${status} ${message}`);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
