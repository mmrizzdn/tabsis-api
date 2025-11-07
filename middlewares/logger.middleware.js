const logger = require('../libs/logger');

/**
 * Middleware to log HTTP requests
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log request
    logger.info('Incoming request', {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
        role: req.user?.role,
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const duration = Date.now() - start;
        
        logger.info('Request completed', {
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user?.id,
        });

        originalEnd.call(this, chunk, encoding);
    };

    next();
};

module.exports = { requestLogger };

