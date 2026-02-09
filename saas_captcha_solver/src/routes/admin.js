import db from '../utils/db.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'RECAP-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
};

async function adminRoutes(fastify, options) {
    // Middleware-like check for Admin (Simplified for now)
    fastify.addHook('preHandler', async (request, reply) => {
        const adminKey = request.headers['adminkey'];
        if (adminKey !== 'super-admin-secret-key') {
            return reply.status(401).send({ error: 'Unauthorized Admin Access' });
        }
    });

    // GET /admin/users - List all users
    fastify.get('/admin/users', async (request, reply) => {
        try {
            const users = await db.query(`
                SELECT id, username, fullName, api_key, role, balance, trial_balance, is_locked,
                strftime('%Y-%m-%dT%H:%M:%SZ', created_at) as created_at,
                strftime('%Y-%m-%dT%H:%M:%SZ', last_login_at) as last_login_at,
                last_login_ip
                FROM users ORDER BY created_at DESC
            `);
            return { errorId: 0, users };
        } catch (err) {
            logger.error(`Admin Fetch Users Error: ${err.message}`);
            return reply.status(500).send({ error: 'Database error' });
        }
    });

    // POST /admin/updateBalance - Adjust user balance
    fastify.post('/admin/updateBalance', async (request, reply) => {
        const { userId, amount, type, description } = request.body || {};

        if (!userId || amount === undefined || !type) {
            return reply.status(400).send({ error: 'Missing parameters: userId, amount, type' });
        }

        try {
            await db.withTransaction(async () => {
                const adjustment = type === 'credit' ? amount : -amount;
                await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [adjustment, userId]);

                await db.run(`
                    INSERT INTO transactions (user_id, amount, type, description) 
                    VALUES (?, ?, ?, ?)
                `, [userId, amount, type, description || 'Admin adjustment']);
            });

            logger.info(`Admin ${type}ed ${amount} for user ${userId}`);
            return { errorId: 0, message: 'Balance updated successfully' };
        } catch (err) {
            logger.error(`Admin Balance Update Error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to update balance' });
        }
    });

    // POST /admin/createUser - Create new sub-account
    fastify.post('/admin/createUser', async (request, reply) => {
        const { username, initialBalance, api_key } = request.body || {};

        if (!username || !api_key) {
            return reply.status(400).send({ error: 'Missing username or api_key' });
        }

        try {
            const result = await db.run(
                'INSERT INTO users (username, api_key, balance) VALUES (?, ?, ?)',
                [username, api_key, initialBalance || 0]
            );
            return { errorId: 0, userId: result.id };
        } catch (err) {
            logger.error(`Admin Create User Error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to create user' });
        }
    });

    // POST /admin/users/update - Edit user details
    fastify.post('/admin/users/update', async (request, reply) => {
        const { userId, password, role, is_locked } = request.body || {};

        if (!userId) {
            return reply.status(400).send({ error: 'Missing userId' });
        }

        try {
            const updates = [];
            const params = [];

            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                updates.push('password = ?');
                params.push(hashedPassword);
            }

            if (role) {
                updates.push('role = ?');
                params.push(role);
            }

            if (is_locked !== undefined) {
                updates.push('is_locked = ?');
                params.push(is_locked ? 1 : 0);
            }

            if (request.body.balance !== undefined) {
                updates.push('balance = ?');
                params.push(Number(request.body.balance));
            }

            if (updates.length === 0) {
                return { errorId: 0, message: 'No changes made' };
            }

            params.push(userId);
            await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

            logger.info(`Admin updated user ${userId}`);
            return { errorId: 0, message: 'User updated successfully' };
        } catch (err) {
            logger.error(`Admin Update User Error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to update user' });
        }
    });

    // --- Gift Codes Management ---

    // GET /admin/gift-codes
    fastify.get('/admin/gift-codes', async (request, reply) => {
        try {
            const codes = await db.query(`
                SELECT 
                    gc.id, 
                    gc.code, 
                    gc.amount, 
                    gc.status, 
                    gc.created_by, 
                    gc.used_by,
                    u.username as used_by_username,
                    strftime('%Y-%m-%dT%H:%M:%SZ', gc.created_at) as created_at,
                    strftime('%Y-%m-%dT%H:%M:%SZ', gc.used_at) as used_at
                FROM gift_codes gc
                LEFT JOIN users u ON gc.used_by = u.id
                ORDER BY gc.created_at DESC
            `);
            return { errorId: 0, codes };
        } catch (err) {
            return reply.status(500).send({ error: 'Database error' });
        }
    });

    // POST /admin/gift-codes/generate
    fastify.post('/admin/gift-codes/generate', async (request, reply) => {
        const { amount, quantity = 1 } = request.body || {};
        const adminId = 1; // Simplify: assume admin ID 1 or fetch from auth if simpler

        if (!amount || amount <= 0) {
            return reply.status(400).send({ error: 'Invalid amount' });
        }

        try {
            const generated = [];
            for (let i = 0; i < quantity; i++) {
                const code = generateCode();
                await db.run(
                    'INSERT INTO gift_codes (code, amount, created_by) VALUES (?, ?, ?)',
                    [code, amount, adminId]
                );
                generated.push(code);
            }

            logger.info(`Generated ${quantity} gift codes of $${amount}`);
            return { errorId: 0, codes: generated, message: 'Codes generated' };
        } catch (err) {
            logger.error(`Gift Code Gen Error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to generate codes' });
        }
    });

    // DELETE /admin/gift-codes/:id
    fastify.delete('/admin/gift-codes/:id', async (request, reply) => {
        const { id } = request.params;
        try {
            await db.run('DELETE FROM gift_codes WHERE id = ?', [id]);
            return { errorId: 0, message: 'Code deleted' };
        } catch (err) {
            return reply.status(500).send({ error: 'Database error' });
        }
    });

    // POST /admin/createUser - Create new sub-account

    // GET /admin/stats - System aggregate stats (Enhanced)
    fastify.get('/admin/stats', async (request, reply) => {
        try {
            // Summary Stats
            const totalSolves = await db.get('SELECT count(*) as count FROM logs');
            const totalRevenue = await db.get('SELECT sum(cost) as sum FROM logs');
            const userCount = await db.get('SELECT count(*) as count FROM users');
            const activeRequests = await db.get('SELECT count(*) as count FROM logs WHERE status IN ("processing", "pending")');
            const failedRequests = await db.get('SELECT count(*) as count FROM logs WHERE status = "error"');

            // Success Rate
            const successRate = totalSolves.count > 0
                ? ((totalSolves.count - failedRequests.count) / totalSolves.count) * 100
                : 100;

            // Today's Stats
            const todaySolves = await db.get("SELECT count(*) as count FROM logs WHERE date(created_at) = date('now')");
            const todayRevenue = await db.get("SELECT sum(cost) as sum FROM logs WHERE date(created_at) = date('now')");

            return {
                errorId: 0,
                stats: {
                    totalSolves: totalSolves.count,
                    totalRevenue: totalRevenue.sum || 0,
                    totalUsers: userCount.count,
                    activeRequests: activeRequests.count,
                    successRate: successRate,
                    todaySolves: todaySolves.count,
                    todayRevenue: todayRevenue.sum || 0
                }
            };
        } catch (err) {
            return reply.status(500).send({ error: 'Database error' });
        }
    });

    // GET /admin/pricing - Get all pricing
    fastify.get('/admin/pricing', async (request, reply) => {
        try {
            const pricing = await db.query('SELECT * FROM pricing ORDER BY id ASC');
            return { errorId: 0, pricing };
        } catch (err) {
            return reply.status(500).send({ error: 'Database error' });
        }
    });

    // GET /admin/notification - Get current notification
    fastify.get('/admin/notification', async (request, reply) => {
        try {
            const setting = await db.get("SELECT value FROM settings WHERE key = 'notification'");
            return { notification: setting?.value || '' };
        } catch (err) {
            return { notification: '' };
        }
    });

    // POST /admin/notification - Update notification
    fastify.post('/admin/notification', async (request, reply) => {
        const { notification } = request.body || {};
        try {
            await db.run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('notification', ?, CURRENT_TIMESTAMP)", [notification || '']);
            logger.info(`Admin updated notification: ${notification}`);
            return { errorId: 0, message: 'Notification updated' };
        } catch (err) {
            logger.error(`Update Notification Error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to update notification' });
        }
    });

    // POST /admin/pricing - Update pricing
    fastify.post('/admin/pricing', async (request, reply) => {
        const { pricing } = request.body || {};

        if (!pricing || !Array.isArray(pricing)) {
            return reply.status(400).send({ error: 'Missing pricing array' });
        }

        try {
            // Clear existing pricing
            await db.run('DELETE FROM pricing');

            // Insert new pricing
            for (const p of pricing) {
                await db.run(
                    'INSERT INTO pricing (name, price, unit, description, speed) VALUES (?, ?, ?, ?, ?)',
                    [p.name, p.price, p.unit || 'solve', p.description || '', p.speed || '1-3s']
                );
            }

            logger.info(`Admin updated pricing: ${pricing.length} items`);
            return { errorId: 0, message: 'Pricing updated successfully' };
        } catch (err) {
            logger.error(`Admin Pricing Update Error: ${err.message}`);
            return reply.status(500).send({ error: 'Failed to update pricing' });
        }
    });

    // --- Admin User Detailed View Endpoints ---

    // GET /admin/users/:id/stats
    fastify.get('/admin/users/:id/stats', async (request, reply) => {
        const { id } = request.params;
        try {
            const solveStats = await db.get(
                'SELECT COUNT(*) as totalSolves, SUM(cost) as totalSpent FROM logs WHERE user_id = ?',
                [id]
            );
            const user = await db.get('SELECT balance FROM users WHERE id = ?', [id]);
            return {
                stats: {
                    totalSolves: solveStats?.totalSolves || 0,
                    totalSpent: solveStats?.totalSpent || 0,
                    balance: user?.balance || 0
                }
            };
        } catch (err) {
            return reply.status(500).send({ error: 'Database error' });
        }
    });

    // GET /admin/users/:id/logs
    fastify.get('/admin/users/:id/logs', async (request, reply) => {
        const { id } = request.params;
        const limit = 50;
        try {
            const logs = await db.query(`
                SELECT task_id, task_type, cost, status, created_at 
                FROM logs 
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            `, [id, limit]);
            return { logs };
        } catch (err) {
            return reply.status(500).send({ error: 'Database error' });
        }
    });

    // GET /admin/users/:id/transactions
    fastify.get('/admin/users/:id/transactions', async (request, reply) => {
        const { id } = request.params;
        try {
            const transactions = await db.query(`
                SELECT * FROM transactions 
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            `, [id]);
            return { transactions };
        } catch (err) {
            return reply.status(500).send({ error: 'Database error' });
        }
    });
}

export default adminRoutes;
