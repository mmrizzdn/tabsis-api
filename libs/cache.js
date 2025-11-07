const redis = require('./redis');
const logger = require('./logger');

const DEFAULT_TTL = Number.parseInt(process.env.CACHE_TTL, 10) || 60;
const NAMESPACE = 'cache';

const withNamespace = (key) => `${NAMESPACE}:${key}`;

const safeParse = (value) => {
    try {
        return JSON.parse(value);
    } catch (error) {
        logger.warn('Failed to parse cached value', {
            error: error.message,
        });
        return null;
    }
};

const safeStringify = (value) => {
    try {
        return JSON.stringify(value);
    } catch (error) {
        logger.error('Failed to serialize value for cache', {
            error: error.message,
        });
        return null;
    }
};

const cache = {
    async get(key) {
        if (!key) return null;

        try {
            const value = await redis.get(withNamespace(key));
            if (!value) {
                return null;
            }
            return safeParse(value);
        } catch (error) {
            logger.warn('Failed to read cache', {
                key,
                error: error.message,
            });
            return null;
        }
    },

    async set(key, value, ttl = DEFAULT_TTL) {
        if (!key) return;
        if (ttl === 0) return;

        const payload = safeStringify(value);
        if (!payload) return;

        try {
            const namespacedKey = withNamespace(key);

            if (ttl && Number.isFinite(ttl) && ttl > 0) {
                await redis.set(namespacedKey, payload, 'EX', ttl);
            } else {
                await redis.set(namespacedKey, payload);
            }
        } catch (error) {
            logger.warn('Failed to write cache', {
                key,
                error: error.message,
            });
        }
    },

    async del(key) {
        if (!key) return 0;

        try {
            return await redis.del(withNamespace(key));
        } catch (error) {
            logger.warn('Failed to delete cache key', {
                key,
                error: error.message,
            });
            return 0;
        }
    },

    async delByPattern(pattern) {
        if (!pattern) return 0;

        const namespacedPattern = withNamespace(pattern);
        const keys = [];

        return new Promise((resolve) => {
            const stream = redis.scanStream({
                match: namespacedPattern,
                count: 100,
            });

            stream.on('data', (resultKeys) => {
                if (Array.isArray(resultKeys)) {
                    keys.push(...resultKeys);
                }
            });

            stream.on('error', (error) => {
                logger.warn('Failed to scan cache keys by pattern', {
                    pattern,
                    error: error.message,
                });
                resolve(0);
            });

            stream.on('end', async () => {
                if (!keys.length) {
                    resolve(0);
                    return;
                }

                try {
                    await redis.del(...keys);
                    resolve(keys.length);
                } catch (error) {
                    logger.warn('Failed to delete cache keys by pattern', {
                        pattern,
                        error: error.message,
                    });
                    resolve(0);
                }
            });
        });
    },

    async wrap(key, ttl, fn) {
        if (!key || typeof fn !== 'function') {
            throw new Error('cache.wrap requires a key and a function');
        }

        const cached = await this.get(key);
        if (cached !== null && cached !== undefined) {
            return cached;
        }

        const result = await fn();
        await this.set(key, result, ttl);
        return result;
    },

    DEFAULT_TTL,
};

module.exports = cache;
