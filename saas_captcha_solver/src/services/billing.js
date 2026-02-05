import db from '../utils/db.js';
import logger from '../utils/logger.js';

const RECAPTCHA_V2_COST = 0.0005; // $0.5 per 1000 requests

export async function validateApiKey(apiKey) {
    try {
        const user = await db.get('SELECT * FROM users WHERE api_key = ?', [apiKey]);
        if (!user) {
            return { valid: false, message: 'Invalid API Key' };
        }
        if (user.balance <= 0) {
            return { valid: false, message: 'Insufficient balance' };
        }
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

    try {
        await db.run('BEGIN TRANSACTION');
        await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [cost, userId]);
        await db.run(`
            INSERT INTO logs (user_id, task_id, task_type, cost, status) 
            VALUES (?, ?, ?, ?, ?)
        `, [userId, taskId, taskType, cost, 'ready']);
        await db.run('COMMIT');

        logger.debug(`Deducted ${cost} from user ${userId} for task ${taskId}`);
        return true;
    } catch (err) {
        await db.run('ROLLBACK').catch(() => { });
        logger.error(`Failed to deduct balance for user ${userId}: ${err.message}`);
        return false;
    }
}

export async function validateTrialKey(apiKey) {
    try {
        const user = await db.get('SELECT * FROM users WHERE api_key = ?', [apiKey]);
        if (!user) {
            return { valid: false, message: 'Invalid API Key' };
        }
        if (user.trial_balance <= 0) {
            return { valid: false, message: 'Insufficient trial balance' };
        }
        return { valid: true, user };
    } catch (err) {
        logger.error(`Trial validation error: ${err.message}`);
        return { valid: false, message: 'Database error' };
    }
}

export async function deductTrialBalance(userId, taskType, taskId) {
    try {
        await db.run('BEGIN TRANSACTION');
        await db.run('UPDATE users SET trial_balance = trial_balance - 1 WHERE id = ?', [userId]);
        await db.run(`
            INSERT INTO logs (user_id, task_id, task_type, cost, status) 
            VALUES (?, ?, ?, ?, ?)
        `, [userId, taskId, taskType + ' (Trial)', 0, 'ready']);
        await db.run('COMMIT');

        logger.debug(`Deducted 1 trial solve from user ${userId} for task ${taskId}`);
        return true;
    } catch (err) {
        await db.run('ROLLBACK').catch(() => { });
        logger.error(`Failed to deduct trial balance for user ${userId}: ${err.message}`);
        return false;
    }
}

