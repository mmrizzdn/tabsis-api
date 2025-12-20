const logger = require('../libs/logger');

module.exports = {
    reqLogger: (req, res, next) => {
        const start = Date.now();

        logger.info('Incoming request', {
            method: req.method,
            url: req.originalUrl || req.url,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            userId: req.user?.id,
            role: req.user?.role,
        });

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
    },

    errLogger: (err, req) => {
        const isPrismaError =
            err.name === 'PrismaClientValidationError' ||
            err.name === 'TypeError' ||
            err.name === 'PrismaClientKnownRequestError' ||
            err.name === 'PrismaClientInitializationError';

        if (isPrismaError) {
            logger.error('Internal server error', {
                error: err.message,
                stack: err.stack,
                name: err.name,
                url: req.originalUrl || req.url,
                method: req.method,
            });
        } else {
            logger.error('Error occurred', {
                error: err.message,
                status: err.status || 500,
                name: err.name,
                url: req.originalUrl || req.url,
                method: req.method,
            });
        }
    }
}
