import db from '../utils/db.js';
import logger from '../utils/logger.js';

const RECAPTCHA_V2_COST = 0.0005; // $0.5 per 1000 requests

// Batching system for high performance
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
    if (pendingDeductions.length >= 50) { // Max 50 items per transaction
        if (batchTimeout) clearTimeout(batchTimeout);
        flushDeductions();
    } else if (!batchTimeout) {
        batchTimeout = setTimeout(flushDeductions, 500); // Flush every 500ms
    }
}

export async function validateApiKey(apiKey) {
    try {
        const user = await db.get('SELECT * FROM users WHERE api_key = ?', [apiKey]);
        if (!user) return { valid: false, message: 'Invalid API Key' };
        if (user.balance <= 0) return { valid: false, message: 'Insufficient balance' };
        return { valid: true, user };
    } catch (err) {
        logger.error(`Validation error: ${err.message}`);
        return { valid: false, message: 'Database error' };
    }
}

export async function deductBalance(userId, taskType, taskId) {
    let cost = 0;
    if (taskType === 'ReCaptchaV2TaskProxyless') {
        cost = RECAPTCHA_V2_COST;
    }
    queueDeduction({ userId, cost, taskType, taskId, trial: false });
    return true;
}

export async function validateTrialKey(apiKey) {
    try {
        const user = await db.get('SELECT * FROM users WHERE api_key = ?', [apiKey]);
        if (!user) return { valid: false, message: 'Invalid API Key' };
        if (user.trial_balance <= 0) return { valid: false, message: 'Insufficient trial balance' };
        return { valid: true, user };
    } catch (err) {
        logger.error(`Trial validation error: ${err.message}`);
        return { valid: false, message: 'Database error' };
    }
}

export async function deductTrialBalance(userId, taskType, taskId) {
    queueDeduction({ userId, taskType, taskId, trial: true });
    return true;
}
