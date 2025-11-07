var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/v1');
const createSuccess = require('./utils/http-success');
const winstonLogger = require('./libs/logger');
const { requestLogger } = require('./middlewares/logger.middleware');
const { sanitize } = require('./middlewares/sanitize.middleware');

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
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sanitize);
app.use(requestLogger);

app.get('/', (req, res) => {
    return createSuccess.ok(res, 'OK');
});
app.use('/api/v1', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    if (
        err.name === 'PrismaClientValidationError' ||
        err.name === 'TypeError' ||
        err.name === 'PrismaClientKnownRequestError' ||
        err.name === 'PrismaClientInitializationError'
    ) {
        winstonLogger.error('Internal server error', {
            error: err.message,
            stack: err.stack,
            name: err.name,
            url: req.originalUrl || req.url,
            method: req.method,
        });
        err.message = 'Internal server error';
    } else {
        winstonLogger.error('Error occurred', {
            error: err.message,
            stack: err.stack,
            status: err.status || 500,
            name: err.name,
            url: req.originalUrl || req.url,
            method: req.method,
        });
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
