import db from '../utils/db.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

async function userRoutes(fastify, options) {
    // Get user stats (Protected)
    fastify.get('/stats', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const userId = request.user.id;

            // Get user balance
            const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);

            // Get total solves count
            const solveStats = await db.get(
                'SELECT COUNT(*) as totalSolves, SUM(cost) as totalSpent FROM logs WHERE user_id = ?',
                [userId]
            );

            // Get last 7 days activity
            const weeklyStats = await db.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as solves,
                    SUM(cost) as spent
                FROM logs 
                WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `, [userId]);

            // Get success rate (assuming status field exists)
            const successRate = await db.get(`
                SELECT 
                    COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*) as rate
                FROM logs 
                WHERE user_id = ?
            `, [userId]);

            return {
                errorId: 0,
                stats: {
                    balance: user?.balance || 0,
                    totalSolves: solveStats?.totalSolves || 0,
                    totalSpent: solveStats?.totalSpent || 0,
                    successRate: successRate?.rate || 100,
                    weeklyActivity: weeklyStats || []
                }
            };
        } catch (err) {
            logger.error(`Stats fetch error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to fetch stats' });
        }
    });

    // Get recent activity logs (Protected)
    fastify.get('/logs', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const limit = parseInt(request.query.limit) || 10;

            const logs = await db.query(`
                SELECT task_id, task_type, cost, status, strftime('%Y-%m-%dT%H:%M:%SZ', created_at) as created_at 
                FROM logs 
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            `, [userId, limit]);

            return { errorId: 0, logs: logs || [] };
        } catch (err) {
            logger.error(`Logs fetch error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to fetch logs' });
        }
    });

    // Regenerate API Key (Protected)
    fastify.post('/regenerate-key', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const newApiKey = `cap_live_${uuidv4().replace(/-/g, '').substring(0, 20)}`;

            await db.run('UPDATE users SET api_key = ? WHERE id = ?', [newApiKey, userId]);

            logger.info(`API Key regenerated for user ${userId}`);
            return { errorId: 0, apiKey: newApiKey };
        } catch (err) {
            logger.error(`Key regeneration error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to regenerate key' });
        }
    });

    // GET /transactions - Get user transaction history
    fastify.get('/transactions', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const transactions = await db.query(`
                SELECT id, user_id, amount, type, description, strftime('%Y-%m-%dT%H:%M:%SZ', created_at) as created_at
                FROM transactions 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 50
            `, [userId]);
            return { errorId: 0, transactions: transactions || [] };
        } catch (err) {
            logger.error(`Transactions fetch error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to fetch transactions' });
        }
    });

    // POST /redeem - Redeem gift code
    fastify.post('/redeem', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const userId = request.user.id;
        const { code } = request.body || {};

        if (!code) {
            return reply.status(400).send({ error: 'Missing code' });
        }

        try {
            const result = await db.withTransaction(async () => {
                // Find valid code
                const gift = await db.get('SELECT * FROM gift_codes WHERE code = ? AND status = "unused"', [code]);

                if (!gift) {
                    throw new Error('INVALID_CODE');
                }

                // Update user balance
                await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [gift.amount, userId]);

                // Mark code as used
                await db.run('UPDATE gift_codes SET status = "used", used_by = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?', [userId, gift.id]);

                // Create transaction log
                await db.run(`
                    INSERT INTO transactions (user_id, amount, type, description)
                    VALUES (?, ?, 'credit', ?)
                `, [userId, gift.amount, `Redeemed Gift Code: ${code}`]);

                return gift;
            });

            logger.info(`User ${userId} redeemed code ${code} for $${result.amount}`);
            return { errorId: 0, message: 'Gift code redeemed successfully', amount: result.amount };
        } catch (err) {
            if (err.message === 'INVALID_CODE') {
                return reply.status(404).send({ error: 'Invalid or used code' });
            }
            logger.error(`Redeem Error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to redeem code' });
        }
    });
}

export default userRoutes;
