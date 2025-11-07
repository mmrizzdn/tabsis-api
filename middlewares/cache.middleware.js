const crypto = require('crypto');

const cache = require('../libs/cache');
const logger = require('../libs/logger');

const hash = (value) => crypto.createHash('sha1').update(value).digest('hex');

const getIdentity = (req) => {
    if (req.user?.id) {
        return `user:${req.user.id}`;
    }

    if (req.ip) {
        return `ip:${req.ip}`;
    }

    return 'anonymous';
};

const buildCacheKey = (req, prefix) => {
    const identity = getIdentity(req);
    const url = req.originalUrl || req.url || '/';
    const hashedUrl = hash(url);

    return `${prefix}:${identity}:${hashedUrl}`;
};

const shouldSkipCache = (req) => {
    if (req.method !== 'GET') {
        return true;
    }

    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-store')) {
        return true;
    }

    if (req.query && typeof req.query.cache === 'string' && req.query.cache === 'false') {
        return true;
    }

    return false;
};

const cacheResponse =
    ({ prefix = 'http', ttl = cache.defaultTtl, keyGenerator, shouldCache } = {}) =>
    async (req, res, next) => {
        try {
            if (shouldSkipCache(req)) {
                return next();
            }

            if (res.locals?.skipCache) {
                return next();
            }

            if (typeof shouldCache === 'function' && !shouldCache(req)) {
                return next();
            }

            const key = typeof keyGenerator === 'function' ? keyGenerator(req) : buildCacheKey(req, prefix);
            if (!key) {
                return next();
            }

            const cached = await cache.get(key);
            if (cached && typeof cached.status === 'number' && cached.body !== undefined) {
                res.set('X-Cache', 'HIT');
                return res.status(cached.status).json(cached.body);
            }

            res.set('X-Cache', 'MISS');

            const originalJson = res.json.bind(res);
            res.json = async (body) => {
                res.json = originalJson;

                const status = res.statusCode || 200;

                if (status >= 200 && status < 400) {
                    await cache.set(key, { status, body }, ttl);
                }

                return originalJson(body);
            };

            return next();
        } catch (error) {
            logger.warn('Cache middleware error', {
                prefix,
                error: error.message,
            });
            return next();
        }
    };

module.exports = {
    cacheResponse,
    buildCacheKey,
};
