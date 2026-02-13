import db from '../utils/db.js';
import logger from '../utils/logger.js';

const RECAPTCHA_V2_COST = 0.0005; // $0.5 per 1000 requests

// ============================================
// ⚡ API Key Cache - In-Memory (RAM)
// ============================================
// Lần đầu validate → query Turso → lưu vào cache
// Lần sau → đọc từ cache (0.01ms thay vì 125ms)
// Cache tự hết hạn sau 30s → đảm bảo balance luôn cập nhật

const apiKeyCache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Get user from cache or database
 * Returns cached user if still valid, otherwise fetches from DB
 */
async function getCachedUser(apiKey) {
    const now = Date.now();
    const cached = apiKeyCache.get(apiKey);

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        // Cache HIT - return cached data
        return { user: cached.user, fromCache: true };
    }

    // Cache MISS or EXPIRED - fetch from database
    const user = await db.get('SELECT * FROM users WHERE api_key = ?', [apiKey]);

    if (user) {
        apiKeyCache.set(apiKey, { user, timestamp: now });
    } else {
        // Cache negative result too (invalid keys), shorter TTL
        apiKeyCache.set(apiKey, { user: null, timestamp: now });
    }

    return { user, fromCache: false };
}

/**
 * Update cached user's balance locally (without DB query)
 * This keeps the cache accurate between full refreshes
 */
function updateCachedBalance(apiKey, deductAmount, field = 'balance') {
    const cached = apiKeyCache.get(apiKey);
    if (cached && cached.user) {
        cached.user[field] = (cached.user[field] || 0) - deductAmount;
    }
}

/**
 * Invalidate cache for a specific API key
 * Call this when admin changes user data
 */
export function invalidateCache(apiKey) {
    apiKeyCache.delete(apiKey);
}

/**
 * Invalidate entire cache
 * Call this on admin bulk operations
 */
export function invalidateAllCache() {
    apiKeyCache.clear();
    logger.info('🗑️ API Key cache cleared');
}

/**
 * Get cache stats (for monitoring)
 */
export function getCacheStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const [, entry] of apiKeyCache) {
        if ((now - entry.timestamp) < CACHE_TTL) {
            activeEntries++;
        } else {
            expiredEntries++;
        }
    }

    return {
        totalEntries: apiKeyCache.size,
        activeEntries,
        expiredEntries,
        cacheTTL: CACHE_TTL / 1000 + 's'
    };
}

// Cleanup expired cache entries every 60s
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of apiKeyCache) {
        if ((now - entry.timestamp) > CACHE_TTL * 2) {
            apiKeyCache.delete(key);
        }
    }
}, 60_000);

// ============================================
// Batching system for high performance writes
// ============================================
let pendingDeductions = [];
let batchTimeout = null;

async function flushDeductions() {
    if (pendingDeductions.length === 0) return;

    const currentBatch = [...pendingDeductions];
    pendingDeductions = [];
    batchTimeout = null;

    try {
        await db.withTransaction(async () => {
            for (const item of currentBatch) {
                const { userId, cost, taskType, taskId, trial } = item;
                if (trial) {
                    await db.run('UPDATE users SET trial_balance = trial_balance - 1 WHERE id = ?', [userId]);
                    await db.run(`
                        INSERT INTO logs (user_id, task_id, task_type, cost, status) 
                        VALUES (?, ?, ?, ?, ?)
                    `, [userId, taskId, taskType + ' (Trial)', 0, 'ready']);
                } else {
                    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [cost, userId]);
                    await db.run(`
                        INSERT INTO logs (user_id, task_id, task_type, cost, status) 
                        VALUES (?, ?, ?, ?, ?)
                    `, [userId, taskId, taskType, cost, 'ready']);
                }
            }
        });
        logger.debug(`Successfully flushed batch of ${currentBatch.length} billing items`);
    } catch (err) {
        logger.error(`Failed to flush billing batch: ${err.message}`);
    }
}

function queueDeduction(item) {
    pendingDeductions.push(item);
    if (pendingDeductions.length >= 50) {
        if (batchTimeout) clearTimeout(batchTimeout);
        flushDeductions();
    } else if (!batchTimeout) {
        batchTimeout = setTimeout(flushDeductions, 500);
    }
}

// ============================================
// Public API (unchanged interface)
// ============================================

export async function validateApiKey(apiKey) {
    try {
        const { user, fromCache } = await getCachedUser(apiKey);

        if (!user) return { valid: false, message: 'Invalid API Key' };
        if (user.is_locked) return { valid: false, message: 'Account is locked' };
        if (user.balance <= 0 && user.trial_balance <= 0) return { valid: false, message: 'Insufficient balance' };

        return { valid: true, user };
    } catch (err) {
        logger.error(`Validation error: ${err.message}`);
        return { valid: false, message: 'Database error' };
    }
}

export async function deductBalance(userId, taskType, taskId, apiKey) {
    let cost = 0;
    if (taskType === 'ReCaptchaV2TaskProxyless') {
        cost = RECAPTCHA_V2_COST;
    }

    // Update cache locally so next validation sees updated balance
    if (apiKey) {
        updateCachedBalance(apiKey, cost, 'balance');
    }

    queueDeduction({ userId, cost, taskType, taskId, trial: false });
    return true;
}

export async function validateTrialKey(apiKey) {
    try {
        const { user, fromCache } = await getCachedUser(apiKey);

        if (!user) return { valid: false, message: 'Invalid API Key' };
        if (user.is_locked) return { valid: false, message: 'Account is locked' };
        if (user.trial_balance <= 0) return { valid: false, message: 'Insufficient trial balance' };

        return { valid: true, user };
    } catch (err) {
        logger.error(`Trial validation error: ${err.message}`);
        return { valid: false, message: 'Database error' };
    }
}

export async function deductTrialBalance(userId, taskType, taskId, apiKey) {
    // Update cache locally
    if (apiKey) {
        updateCachedBalance(apiKey, 1, 'trial_balance');
    }

    queueDeduction({ userId, taskType, taskId, trial: true });
    return true;
}
