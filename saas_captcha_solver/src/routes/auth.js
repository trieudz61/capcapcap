import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db.js';
import logger from '../utils/logger.js';

async function authRoutes(fastify, options) {
    // Register
    fastify.post('/register', async (request, reply) => {
        const { username, password, fullName } = request.body || {};

        if (!username || !password) {
            return reply.status(400).send({ error: 'Username and password required' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const apiKey = `cap_live_${uuidv4().replace(/-/g, '').substring(0, 20)}`;

            const result = await db.run(
                'INSERT INTO users (username, password, api_key, fullName, balance, trial_balance) VALUES (?, ?, ?, ?, ?, ?)',
                [username, hashedPassword, apiKey, fullName || '', 0.0, 100]
            );

            logger.info(`New user registered: ${username} (${fullName || 'No Name'})`);
            return { errorId: 0, message: 'Registration successful', userId: result.id };
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return reply.status(409).send({ error: 'Username already exists' });
            }
            logger.error(`Registration error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Login
    fastify.post('/login', async (request, reply) => {
        const { username, password } = request.body || {};

        if (!username || !password) {
            return reply.status(400).send({ error: 'Username and password required' });
        }

        try {
            const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

            if (!user || !user.password) {
                return reply.status(401).send({ error: 'Invalid credentials' });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return reply.status(401).send({ error: 'Invalid credentials' });
            }

            const token = fastify.jwt.sign({
                id: user.id,
                username: user.username,
                role: user.role
            });

            const loginIp = request.ip || request.headers['x-forwarded-for'] || '127.0.0.1';
            await db.run(
                'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?',
                [loginIp, user.id]
            );

            logger.info(`User logged in: ${username} from IP: ${loginIp}`);
            return { errorId: 0, token, user: { id: user.id, username: user.username, role: user.role, balance: user.balance, trial_balance: user.trial_balance, apiKey: user.api_key } };
        } catch (err) {
            logger.error(`Login error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Get current profile (Protected)
    fastify.get('/me', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const user = await db.get('SELECT id, username, fullName, role, balance, trial_balance, api_key FROM users WHERE id = ?', [request.user.id]);
        return { errorId: 0, user };
    });
}

export default authRoutes;
