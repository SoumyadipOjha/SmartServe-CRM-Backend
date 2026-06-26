const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error({ err: { message: err.message, name: err.name, code: err.code }, path: req.path }, 'Unhandled error');

    let statusCode = err.statusCode || 500;
    let message = 'Internal server error';
    let errors = [];

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        for (const field in err.errors) {
            errors.push({ field, message: err.errors[field].message });
        }
    }

    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    if (err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate entry found';
        const field = Object.keys(err.keyValue)[0];
        errors.push({ field, message: `${field} already exists` });
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    res.status(statusCode).json({
        success: false,
        message,
        errors: errors.length > 0 ? errors : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

module.exports = errorHandler;
