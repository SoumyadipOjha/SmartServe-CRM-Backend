const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// express-mongo-sanitize is incompatible with Express 5 (req.query getter)
// Use a minimal inline sanitizer instead
function deepStrip$(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
            delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            deepStrip$(obj[key]);
        }
    }
}
const swaggerUi = require('swagger-ui-express');
const passport = require('passport');
const logger = require('./utils/logger');

// Load environment variables
dotenv.config();
require('./utils/validateEnv')();

// Import routes
const customerRoutes  = require('./routes/customer.routes');
const orderRoutes     = require('./routes/order.routes');
const campaignRoutes  = require('./routes/campaign.routes');
const authRoutes      = require('./routes/auth.routes');
const aiRoutes        = require('./routes/ai.routes');
const segmentRoutes   = require('./routes/segment.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const emailRoutes     = require('./routes/email.routes');
const webhookRoutes      = require('./routes/webhook.routes');
const taskRoutes         = require('./routes/task.routes');
const tasksGlobalRoutes  = require('./routes/tasks-global.routes');
const dealRoutes         = require('./routes/deal.routes');
const customFieldRoutes     = require('./routes/custom-field.routes');
const leadFormRoutes        = require('./routes/lead-form.routes');
const sequenceRoutes        = require('./routes/sequence.routes');
const teamRoutes            = require('./routes/team.routes');
const campaignScheduler     = require('./services/campaign-scheduler.service');
const sequenceScheduler     = require('./services/sequence-scheduler.service');

// Import error middleware
const errorHandler = require('./middleware/error.middleware');
const { authenticateJWT } = require('./middleware/auth.middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse-proxy headers (Render, Railway, etc.) so rate-limit can read real client IP
app.set('trust proxy', 1);

// Configure passport
require('./config/passport');

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-origin' },
    contentSecurityPolicy: false, // API-only; no HTML served
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' &&
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

// ── Body parsing — with size cap to prevent large-payload DoS ─────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ── NoSQL injection sanitisation ──────────────────────────────────────────────
app.use((req, res, next) => {
    deepStrip$(req.body);
    deepStrip$(req.params);
    next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' },
});

const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { message: 'Email send limit reached. Please try again in an hour.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many auth attempts. Please try again later.' },
});

const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { message: 'AI request limit reached. Please try again later.' },
});

app.use('/api/', apiLimiter);

// ── Passport ──────────────────────────────────────────────────────────────────
app.use(passport.initialize());

// ── Health check — no auth, no rate limit ─────────────────────────────────────
app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const healthy = dbState === 1;
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
        uptime: Math.floor(process.uptime()),
    });
});

// ── API documentation — protected behind auth ─────────────────────────────────
const swaggerDocument = require('./swagger.json');
app.use('/api-docs', authenticateJWT, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ai',        aiLimiter, aiRoutes);
app.use('/api/segments',  segmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email',     emailRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/customers/:customerId/tasks', taskRoutes);
app.use('/api/tasks', tasksGlobalRoutes);
<<<<<<< HEAD
app.use('/api/deals', dealRoutes);
app.use('/api/custom-fields', customFieldRoutes);
=======
<<<<<<< Updated upstream
=======
app.use('/api/deals', dealRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/lead-forms', leadFormRoutes);
app.use('/api/sequences', authenticateJWT, sequenceRoutes);
app.use('/api/team', teamRoutes);
>>>>>>> Stashed changes
>>>>>>> chore/integration

app.use('/api/email/test', emailLimiter);

// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: 'Flayx API' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── DB + server ───────────────────────────────────────────────────────────────
let server;

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        logger.info('Connected to MongoDB');
        server = app.listen(PORT, () => {
            logger.info({ port: PORT }, 'Server started');
        });
        campaignScheduler.start();
        sequenceScheduler.start();
    })
    .catch((error) => {
        logger.error({ err: error }, 'MongoDB connection error');
        process.exit(1);
    });

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
    logger.info({ signal }, 'Shutdown signal received');
    if (!server) process.exit(0);
    campaignScheduler.stop();
    sequenceScheduler.stop();
    server.close(() => {
        mongoose.connection.close()
            .then(() => { logger.info('Graceful shutdown complete'); process.exit(0); })
            .catch(() => process.exit(1));
    });
    // Force-kill if still running after 10 s
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
