var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/v1');
const createSuccess = require('./utils/http-success');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

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
        console.error(err);
        err.message = 'Internal server error';
    } else {
        console.error(err);
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
