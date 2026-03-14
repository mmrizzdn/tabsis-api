var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var cors = require('cors');
var createError = require('http-errors');

var indexRouter = require('./routes/v1');
const createSuccess = require('./utils/http-success');
const { reqLogger, errLogger } = require('./middlewares/logger.middleware');
const { sanitize } = require('./middlewares/sanitize.middleware');
const config = require('./config/index');

var app = express();

app.set('trust proxy', true);

const { rateLimit } = require('./middlewares/rate-limiter.middleware');
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    keyPrefix: 'global',
    message: 'Too many requests from this IP, please try again later',
});

app.use(globalLimiter);
app.use(
    cors({
        origin: (origin, cb) => {
            const allowedOrigins = (config.corsOrigin || '').split(',').map((o) => o.trim());
            if (!origin || allowedOrigins.includes(origin)) {
                cb(null, true);
            } else {
                cb(createError(403, 'Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
);
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sanitize);
app.use(reqLogger);

app.get('/', (req, res) => {
    return createSuccess.ok(res, 'OK');
});
app.use('/api/v1', indexRouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
    // Set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    errLogger(err, req);

    if (
        err.name === 'PrismaClientValidationError' ||
        err.name === 'TypeError' ||
        err.name === 'PrismaClientKnownRequestError' ||
        err.name === 'PrismaClientInitializationError'
    ) {
        err.message = 'Internal server error';
    }

    res.status(err.status || 500).json({
        status: false,
        code: err.status || 500,
        message: err.message,
        details: err.details,
        data: null,
    });
});

module.exports = app;
