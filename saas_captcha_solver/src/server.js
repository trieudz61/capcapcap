import './utils/env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import logger from './utils/logger.js';
import captchaRoutes from './routes/captcha.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import { rateLimiter, securityHeaders, payloadLimiter, getRateLimitStats } from './middlewares/rateLimit.js';
import { getTurnstileStats, shutdownTurnstilePool } from './services/turnstile.js';

const fastify = Fastify({
    logger: false,
    bodyLimit: 50 * 1024, // 50KB max payload (Fastify built-in protection)
    connectionTimeout: 10_000, // 10s connection timeout (anti-slowloris)
    requestTimeout: 30_000, // 30s request timeout
});

// Register JWT
fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-key-cap-solver-2024'
});

// Auth Decorator
fastify.decorate('authenticate', async (request, reply) => {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

// Register CORS
await fastify.register(cors, {
    origin: '*'
});

// ============================================
// 🛡️ Security Middleware Stack (order matters!)
// ============================================
// 1. Security Headers (always)
fastify.addHook('onRequest', securityHeaders);
// 2. Payload Size Check
fastify.addHook('onRequest', payloadLimiter);
// 3. Smart Rate Limiter (DDoS protection)
fastify.addHook('onRequest', rateLimiter);

// Health check
fastify.get('/health', async (request, reply) => {
    return {
        status: 'ok',
        uptime: process.uptime(),
        turnstile: getTurnstileStats(),
    };
});

// Public API: Get Notification
fastify.get('/api/notification', async (request, reply) => {
    try {
        const db = (await import('./utils/db.js')).default;
        const setting = await db.get("SELECT value FROM settings WHERE key = 'notification'");
        return { notification: setting?.value || '' };
    } catch (err) {
        return { notification: '' };
    }
});

// Public API: Pricing
fastify.get('/api/pricing', async (request, reply) => {
    try {
        const db = (await import('./utils/db.js')).default;
        const pricing = await db.query('SELECT id, name, price, unit, description, speed FROM pricing ORDER BY id ASC');
        return { pricing };
    } catch (err) {
        return { pricing: [] };
    }
});

// Register Routes
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(userRoutes, { prefix: '/user' });
fastify.register(captchaRoutes, { prefix: '/captcha' });
fastify.register(adminRoutes);

// Start server
const start = async () => {
    try {
        const port = process.env.PORT || 5050;
        await fastify.listen({ port, host: '0.0.0.0' });
        logger.info(`🚀 Recap1s API running at http://localhost:${port}`);
        logger.info(`🛡️ Anti-DDoS protection: ACTIVE`);
        logger.info(`🔧 Turnstile solver: STANDBY (lazy init on first request)`);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await shutdownTurnstilePool();
    await fastify.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await shutdownTurnstilePool();
    await fastify.close();
    process.exit(0);
});

start();
