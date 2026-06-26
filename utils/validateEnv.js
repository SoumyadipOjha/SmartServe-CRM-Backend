'use strict';

const REQUIRED = [
    'MONGODB_URI',
    'JWT_SECRET',
    'RESEND_API_KEY',
];

const PRODUCTION_ONLY = [
    'CLIENT_URL',
    'BASE_URL',
    'UNSUB_SECRET',
];

const WEAK_SECRETS = [
    'smartserve-local-dev-jwt-secret-2025',
    'your-jwt-secret',
    'secret',
    'jwt_secret',
    'changeme',
];

function validateEnv() {
    const missing = REQUIRED.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error(`\n[startup] Missing required environment variables:\n  ${missing.join('\n  ')}\n`);
        console.error('Set them in your .env file or environment before starting.\n');
        process.exit(1);
    }

    if (process.env.NODE_ENV === 'production') {
        const missingProd = PRODUCTION_ONLY.filter(key => !process.env[key]);
        if (missingProd.length > 0) {
            console.error(`\n[startup] Missing production environment variables:\n  ${missingProd.join('\n  ')}\n`);
            process.exit(1);
        }

        const jwt = process.env.JWT_SECRET;
        if (WEAK_SECRETS.includes(jwt) || jwt.length < 32) {
            console.error('\n[startup] JWT_SECRET is too weak for production — use a random string of at least 32 characters.\n');
            process.exit(1);
        }
    }
}

module.exports = validateEnv;
