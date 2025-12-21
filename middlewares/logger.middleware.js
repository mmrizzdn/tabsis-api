const logger = require('../libs/logger');

module.exports = {
    reqLogger: (req, res, next) => {
        const start = Date.now();
        req._startTime = start

        const originalEnd = res.end;
        res.end = function (chunk, encoding) {
            const duration = Date.now() - start;

            if (res.statusCode < 400) {
                logger.info(`${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms`, {
                    method: req.method,
                    url: req.originalUrl || req.url,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('user-agent'),
                    userId: req.user?.id,
                    role: req.user?.role,
                });
            }

            originalEnd.call(this, chunk, encoding);
        };

        next();
    },

    errLogger: (err, req) => {
        const duration = req._startTime ? Date.now() - req._startTime : 0;
        const isPrismaError =
            err.name === 'PrismaClientValidationError' ||
            err.name === 'TypeError' ||
            err.name === 'PrismaClientKnownRequestError' ||
            err.name === 'PrismaClientInitializationError';

        logger.error(`${req.method} ${req.originalUrl || req.url} ${err.status || 500} ${duration}ms - ${err.name}: ${err.message}`, {
            method: req.method,
            url: req.originalUrl || req.url,
            status: err.status || 500,
            duration: `${duration}ms`,
            error: err.message,
            name: err.name,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            userId: req.user?.id,
            ...(isPrismaError && { stack: err.stack }),
        });
    }
}
