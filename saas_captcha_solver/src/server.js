import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import logger from './utils/logger.js';
import captchaRoutes from './routes/captcha.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';

const fastify = Fastify({
    logger: false
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

// Health check
fastify.get('/health', async (request, reply) => {
    return { status: 'ok', uptime: process.uptime() };
});

// Public API - Pricing (no auth)
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

fastify.get('/api/pricing', async (request, reply) => {
    try {
        const db = (await import('./utils/db.js')).default;
        const pricing = await db.query('SELECT id, name, price, unit, description, speed FROM pricing ORDER BY id ASC');
        return { pricing };
    } catch (err) {
        return { pricing: [] };
    }
});

// Import Rate Limiter
import { rateLimiter } from './middlewares/rateLimit.js';
fastify.addHook('onRequest', rateLimiter);

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
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

start();
