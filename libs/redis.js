const Redis = require('ioredis');

const config = require('../config/index');

const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryStrategy(times) {
        return Math.min(times * 50, 2000);
    },
});

redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('error', (err) => {
    console.error('Redis error:', err);
});

module.exports = redis;
