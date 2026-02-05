import logger from '../utils/logger.js';

const rateLimit = new Map();

// Configuration
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_IP = 10000;
const MAX_REQUESTS_PER_USER = 6000; // 1 request per second average

const cleanup = () => {
    const now = Date.now();
    for (const [key, data] of rateLimit.entries()) {
        if (now - data.startTime > WINDOW_MS) {
            rateLimit.delete(key);
        }
    }
};

// Cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

export const rateLimiter = async (request, reply) => {
    // Skip for static resources or health checks if needed
    if (request.url.startsWith('/public') || request.url === '/health') return;

    const ip = request.ip;
    const userId = request.user?.id; // Available if authenticated

    const now = Date.now();

    // IP Based Limit
    const ipKey = `ip:${ip}`;
    let ipData = rateLimit.get(ipKey);

    if (!ipData || now - ipData.startTime > WINDOW_MS) {
        ipData = { count: 0, startTime: now };
    }

    ipData.count++;
    rateLimit.set(ipKey, ipData);

    if (ipData.count > MAX_REQUESTS_PER_IP) {
        logger.warn(`Rate limit exceeded for IP ${ip}`);
        return reply.status(429).send({ error: 'Too Many Requests (IP)' });
    }

    // User Based Limit (if authenticated)
    if (userId) {
        const userKey = `user:${userId}`;
        let userData = rateLimit.get(userKey);

        if (!userData || now - userData.startTime > WINDOW_MS) {
            userData = { count: 0, startTime: now };
        }

        userData.count++;
        rateLimit.set(userKey, userData);

        if (userData.count > MAX_REQUESTS_PER_USER) {
            logger.warn(`Rate limit exceeded for User ${userId}`);
            return reply.status(429).send({ error: 'Too Many Requests (User)' });
        }
    }
};
