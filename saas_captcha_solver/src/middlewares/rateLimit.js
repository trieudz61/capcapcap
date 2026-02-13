import logger from '../utils/logger.js';

// ============================================
// 🛡️ SMART RATE LIMITER - Anti-DDoS System
// ============================================
// Phân biệt khách hàng (API Key) vs kẻ tấn công
// Các bucket rate limit riêng cho từng loại request

// --- Configuration ---
const CONFIG = {
    // Rate limits per category (requests per window)
    limits: {
        // Unauthenticated public endpoints (landing page, pricing, docs)
        public: { max: 60, windowMs: 60_000 },

        // Auth endpoints (login, register) - strict to prevent brute force
        auth: { max: 10, windowMs: 60_000 },

        // Captcha API with valid API Key - high throughput for paying customers
        captchaApi: { max: 6000, windowMs: 60_000 },

        // Admin endpoints
        admin: { max: 120, windowMs: 60_000 },

        // Global per-IP limit (catches all traffic from a single IP)
        globalIp: { max: 10000, windowMs: 60_000 },
    },

    // Auto-ban: If an IP hits rate limit this many times, ban them temporarily
    banThreshold: 10,        // Strike count before temp ban
    banDuration: 10 * 60_000, // 10 minutes ban

    // Cleanup interval
    cleanupInterval: 2 * 60_000, // Every 2 minutes
};

// --- Storage ---
const buckets = new Map();     // Rate limit counters
const bannedIPs = new Map();   // Temporarily banned IPs
const strikeCounter = new Map(); // Count how many times an IP hit rate limits

// --- Helpers ---

/**
 * Get or create a rate limit bucket
 */
function getBucket(key, config) {
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now - bucket.startTime > config.windowMs) {
        bucket = { count: 0, startTime: now };
        buckets.set(key, bucket);
    }

    return bucket;
}

/**
 * Check if request exceeds rate limit for a specific bucket
 * Returns true if BLOCKED
 */
function isRateLimited(key, config) {
    const bucket = getBucket(key, config);
    bucket.count++;

    if (bucket.count > config.max) {
        return true;
    }
    return false;
}

/**
 * Add a strike to an IP. Returns true if IP should be banned.
 */
function addStrike(ip) {
    const now = Date.now();
    let strikes = strikeCounter.get(ip);

    if (!strikes || now - strikes.firstStrike > CONFIG.banDuration) {
        strikes = { count: 0, firstStrike: now };
    }

    strikes.count++;
    strikeCounter.set(ip, strikes);

    if (strikes.count >= CONFIG.banThreshold) {
        bannedIPs.set(ip, now + CONFIG.banDuration);
        strikeCounter.delete(ip);
        logger.warn(`🚫 IP ${ip} auto-banned for ${CONFIG.banDuration / 60000} minutes (${strikes.count} rate limit violations)`);
        return true;
    }

    return false;
}

/**
 * Determine the category of the request
 */
function categorizeRequest(url, method) {
    // Auth endpoints
    if (url.startsWith('/auth/')) {
        return 'auth';
    }

    // Admin endpoints
    if (url.startsWith('/admin/') || url.startsWith('/admin')) {
        return 'admin';
    }

    // Captcha API endpoints (these need high throughput)
    if (url.startsWith('/captcha/')) {
        return 'captchaApi';
    }

    // User API endpoints (authenticated)
    if (url.startsWith('/user/')) {
        return 'captchaApi'; // Same high limit for authenticated users
    }

    // Everything else: public
    return 'public';
}

// --- Cleanup ---
setInterval(() => {
    const now = Date.now();

    // Clean expired buckets
    for (const [key, bucket] of buckets.entries()) {
        // Find the max window across all configs
        if (now - bucket.startTime > 120_000) { // 2 minutes stale
            buckets.delete(key);
        }
    }

    // Clean expired bans
    for (const [ip, expiresAt] of bannedIPs.entries()) {
        if (now > expiresAt) {
            bannedIPs.delete(ip);
            logger.info(`✅ IP ${ip} ban expired`);
        }
    }

    // Clean old strikes
    for (const [ip, strikes] of strikeCounter.entries()) {
        if (now - strikes.firstStrike > CONFIG.banDuration) {
            strikeCounter.delete(ip);
        }
    }
}, CONFIG.cleanupInterval);

// ============================================
// Main Rate Limiter Middleware
// ============================================
export const rateLimiter = async (request, reply) => {
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || request.headers['x-real-ip']
        || request.ip;
    const url = request.url;
    const method = request.method;

    // Skip health check entirely
    if (url === '/health') return;

    // ---- Check 1: Is IP banned? ----
    const banExpiry = bannedIPs.get(ip);
    if (banExpiry) {
        if (Date.now() < banExpiry) {
            const remainingSec = Math.ceil((banExpiry - Date.now()) / 1000);
            return reply.status(403).send({
                error: 'IP_TEMPORARILY_BANNED',
                message: `Your IP has been temporarily blocked due to suspicious activity. Retry after ${remainingSec}s.`,
                retryAfter: remainingSec
            });
        } else {
            bannedIPs.delete(ip);
        }
    }

    // ---- Check 2: Global per-IP rate limit ----
    if (isRateLimited(`global:${ip}`, CONFIG.limits.globalIp)) {
        logger.warn(`⚠️ Global IP rate limit exceeded: ${ip} on ${method} ${url}`);
        addStrike(ip);
        return reply.status(429).send({
            error: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded. Please slow down.',
            retryAfter: Math.ceil(CONFIG.limits.globalIp.windowMs / 1000)
        });
    }

    // ---- Check 3: Category-specific rate limit ----
    const category = categorizeRequest(url, method);
    const limitConfig = CONFIG.limits[category];

    // For captcha API, rate limit by API key (from request body) if possible
    // For other categories, rate limit by IP
    let rateLimitKey;

    if (category === 'captchaApi') {
        // Try to extract clientKey from body for per-user limiting
        const clientKey = request.body?.clientKey;
        if (clientKey) {
            rateLimitKey = `user:${clientKey}`;
        } else {
            // Authenticated user routes - use JWT user id if available
            rateLimitKey = `cat:${category}:${ip}`;
        }
    } else {
        rateLimitKey = `cat:${category}:${ip}`;
    }

    if (isRateLimited(rateLimitKey, limitConfig)) {
        logger.warn(`⚠️ ${category} rate limit exceeded: ${ip} on ${method} ${url}`);

        // Only add strikes for non-authenticated categories
        if (category !== 'captchaApi') {
            addStrike(ip);
        }

        return reply.status(429).send({
            error: 'TOO_MANY_REQUESTS',
            message: `Rate limit exceeded for ${category}. Please slow down.`,
            retryAfter: Math.ceil(limitConfig.windowMs / 1000)
        });
    }
};

// ============================================
// Security Headers Middleware
// ============================================
export const securityHeaders = async (request, reply) => {
    reply.headers({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Request-Id': crypto.randomUUID?.() || Date.now().toString(36),
    });
};

// ============================================
// Request Size Limiter (anti payload flood)
// ============================================
export const payloadLimiter = async (request, reply) => {
    const contentLength = parseInt(request.headers['content-length'] || '0');
    const MAX_PAYLOAD = 50 * 1024; // 50KB max (captcha requests are tiny)

    if (contentLength > MAX_PAYLOAD) {
        logger.warn(`⚠️ Oversized payload rejected: ${contentLength} bytes from ${request.ip}`);
        return reply.status(413).send({
            error: 'PAYLOAD_TOO_LARGE',
            message: 'Request body too large'
        });
    }
};

// ============================================
// Stats Export (for admin monitoring)
// ============================================
export const getRateLimitStats = () => ({
    activeBuckets: buckets.size,
    bannedIPs: bannedIPs.size,
    bannedIPList: Array.from(bannedIPs.entries()).map(([ip, expiry]) => ({
        ip,
        expiresAt: new Date(expiry).toISOString(),
        remainingSec: Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
    })),
    strikeCounters: strikeCounter.size
});
