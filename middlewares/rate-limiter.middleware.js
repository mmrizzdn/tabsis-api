const createError = require('http-errors');
const redis = require('../libs/redis');

module.exports = {
    rateLimit: (options) => {
        return async (req, res, next) => {
            try {
                let { windowMs, max } = options;
                let ip = req.ip;
                let keyPrefix = options.keyPrefix || 'global';
                let key = `rate_limit:${keyPrefix}:${ip}`;

                let requests = await redis.incr(key);

                if (requests === 1) {
                    await redis.pexpire(key, windowMs);
                }

                let remaining = Math.max(0, max - requests);
                let resetTime = Math.floor((Date.now() + windowMs) / 1000);

                res.setHeader('X-RateLimit-Limit', max);
                res.setHeader('X-RateLimit-Remaining', remaining);
                res.setHeader('X-RateLimit-Reset', resetTime);

                console.log(
                    `[${options.keyPrefix || 'general'}] IP ${ip} has made ${requests}/${max} requests.`
                );

                if (requests > max) {
                    next(
                        createError(
                            429,
                            'There have been several failed attempts to sign in from this account or IP address. Please wait a while and try again late.'
                        )
                    );
                }

                next();
            } catch (err) {
                next(err);
            }
        };
    },
};
