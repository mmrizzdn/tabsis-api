var express = require('express');
var router = express.Router();

const { rateLimit } = require('../../middlewares/rate-limiter.middleware');
const { auth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validator.middleware');
const { loginSchema } = require('../../validators/v1/auth.validator');
const { login, refreshToken, logout } = require('../../controllers/v1/auth.controller');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyPrefix: 'login',
    message: 'Too many login attempts, please try again after 15 minutes.',
});

router.post('/login', loginLimiter, validate(loginSchema, 'body'), login);
router.get('/refresh-token', refreshToken);
router.post('/logout', auth, logout);

module.exports = router;
