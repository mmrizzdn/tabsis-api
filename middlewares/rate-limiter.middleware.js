const createError = require('http-errors');
const redis = require('../libs/redis');
const logger = require('../libs/logger');

module.exports = {
  rateLimit: (options) => {
    return async (req, res, next) => {
      try {
        let windowMs = options.windowMs || options.windowS || 60 * 1000;
        let max = options.max || 100;
        let ip = req.ip || req.socket.remoteAddress || 'unknown';
        let keyPrefix = options.keyPrefix || 'global';

        let identifier = req.user?.id ? `user:${req.user.id}` : `ip:${ip}`;
        let key = `rate_limit:${keyPrefix}:${identifier}`;

        let requests = await redis.incr(key);

        if (requests === 1) {
          await redis.pexpire(key, windowMs);
        }

        let remaining = Math.max(0, max - requests);
        let resetTime = Math.floor((Date.now() + windowMs) / 1000);

        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetTime);

        if (requests > max) {
          return next(createError(429, options.message || 'Too many requests, please try again later'));
        }

        next();
      } catch (err) {
        logger.error('Rate limiter error', {
          error: err.message,
          stack: err.stack,
          ip: req.ip || req.socket.remoteAddress,
        });
        next();
      }
    };
  },
};
