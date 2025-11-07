const Redis = require('ioredis');

const config = require('../config/index');
const logger = require('./logger');

const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryStrategy(times) {
        return Math.min(times * 50, 2000);
    },
});

redis.on('error', (err) => {
    logger.error('Redis error', {
        error: err.message,
        stack: err.stack,
        host: config.redis.host,
        port: config.redis.port,
    });
});

module.exports = redis;
