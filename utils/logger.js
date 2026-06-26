'use strict';

const pino = require('pino');

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(process.env.NODE_ENV !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true, ignore: 'pid,hostname' },
        },
    }),
    redact: {
        paths: ['*.password', '*.pass', '*.token', '*.secret', '*.SMTP_PASS', '*.SMTP_USER'],
        censor: '[REDACTED]',
    },
});

module.exports = logger;
