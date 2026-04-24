import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import db from '../utils/db.js';
import logger from '../utils/logger.js';
import { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function authRoutes(fastify, options) {

    // ============================================
    // Register — creates unverified user + sends OTP
    // ============================================
    fastify.post('/register', async (request, reply) => {
        const { username, password, fullName, email } = request.body || {};

        if (!username || !password || !email) {
            return reply.status(400).send({ error: 'Username, email and password required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return reply.status(400).send({ error: 'Email không hợp lệ' });
        }

        try {
            // Check if email already used
            const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [email]);
            if (existingEmail) {
                return reply.status(409).send({ error: 'Email này đã được sử dụng' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const apiKey = `cap_live_${uuidv4().replace(/-/g, '').substring(0, 20)}`;
            const verificationCode = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

            const result = await db.run(
                `INSERT INTO users (username, password, api_key, fullName, email, balance, trial_balance, email_verified, verification_code, verification_expires)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [username, hashedPassword, apiKey, fullName || '', email, 0.0, 100, 0, verificationCode, expiresAt]
            );

            // Send verification email
            const emailSent = await sendVerificationEmail(email, verificationCode, username);

            logger.info(`New user registered: ${username} (${email}) - Email sent: ${emailSent}`);
            return {
                errorId: 0,
                message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.',
                userId: result.id,
                emailSent,
                requireVerification: true
            };
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                const field = err.message.includes('username') ? 'Username' : 'Thông tin';
                return reply.status(409).send({ error: `${field} đã tồn tại` });
            }
            logger.error(`Registration error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ============================================
    // Verify Email — validates OTP code
    // ============================================
    fastify.post('/verify-email', async (request, reply) => {
        const { email, code } = request.body || {};

        if (!email || !code) {
            return reply.status(400).send({ error: 'Email và mã xác thực là bắt buộc' });
        }

        try {
            const user = await db.get(
                'SELECT id, username, verification_code, verification_expires, email_verified FROM users WHERE email = ?',
                [email]
            );

            if (!user) {
                return reply.status(404).send({ error: 'Email không tồn tại trong hệ thống' });
            }

            if (user.email_verified === 1) {
                return { errorId: 0, message: 'Email đã được xác thực trước đó', alreadyVerified: true };
            }

            // Check expiration
            if (new Date(user.verification_expires) < new Date()) {
                return reply.status(400).send({ error: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.' });
            }

            // Check code
            if (user.verification_code !== code.trim()) {
                return reply.status(400).send({ error: 'Mã xác thực không đúng' });
            }

            // Mark email as verified
            await db.run(
                'UPDATE users SET email_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?',
                [user.id]
            );

            logger.info(`Email verified: ${user.username} (${email})`);
            return { errorId: 0, message: 'Xác thực email thành công!' };
        } catch (err) {
            logger.error(`Email verification error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ============================================
    // Resend verification code
    // ============================================
    fastify.post('/resend-code', async (request, reply) => {
        const { email } = request.body || {};

        if (!email) {
            return reply.status(400).send({ error: 'Email là bắt buộc' });
        }

        try {
            const user = await db.get(
                'SELECT id, username, email_verified FROM users WHERE email = ?',
                [email]
            );

            if (!user) {
                return reply.status(404).send({ error: 'Email không tồn tại' });
            }

            if (user.email_verified === 1) {
                return reply.status(400).send({ error: 'Email đã được xác thực' });
            }

            const newCode = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

            await db.run(
                'UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?',
                [newCode, expiresAt, user.id]
            );

            const emailSent = await sendVerificationEmail(email, newCode, user.username);

            logger.info(`Resent verification code to ${email} - Sent: ${emailSent}`);
            return { errorId: 0, message: 'Đã gửi lại mã xác thực!', emailSent };
        } catch (err) {
            logger.error(`Resend code error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ============================================
    // Login — checks email_verified
    // ============================================
    fastify.post('/login', async (request, reply) => {
        const { username, password } = request.body || {};

        if (!username || !password) {
            return reply.status(400).send({ error: 'Username and password required' });
        }

        try {
            // Allow login by username OR email
            const user = await db.get(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, username]
            );

            if (!user || !user.password) {
                return reply.status(401).send({ error: 'Tài khoản hoặc mật khẩu không đúng' });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return reply.status(401).send({ error: 'Tài khoản hoặc mật khẩu không đúng' });
            }

            // Check if account is locked
            if (user.is_locked) {
                return reply.status(403).send({ error: 'Tài khoản đã bị khóa. Vui lòng liên hệ admin.' });
            }

            // Check email verification
            if (user.email_verified !== 1) {
                return reply.status(403).send({
                    error: 'Email chưa được xác thực',
                    requireVerification: true,
                    email: user.email
                });
            }

            const token = fastify.jwt.sign({
                id: user.id,
                username: user.username,
                role: user.role
            });

            const loginIp = request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.ip || '127.0.0.1';
            await db.run(
                'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?',
                [loginIp, user.id]
            );

            logger.info(`User logged in: ${user.username} from IP: ${loginIp}`);
            return {
                errorId: 0,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    balance: user.balance,
                    trial_balance: user.trial_balance,
                    apiKey: user.api_key
                }
            };
        } catch (err) {
            logger.error(`Login error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ============================================
    // Get current profile (Protected)
    // ============================================
    fastify.get('/me', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const user = await db.get(
            'SELECT id, username, email, fullName, role, balance, trial_balance, api_key, email_verified FROM users WHERE id = ?',
            [request.user.id]
        );
        return { errorId: 0, user };
    });

    // ============================================
    // Update Profile (Protected)
    // ============================================
    fastify.put('/update-profile', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { fullName, email } = request.body || {};
        const userId = request.user.id;

        try {
            const currentUser = await db.get('SELECT id, email FROM users WHERE id = ?', [userId]);
            if (!currentUser) {
                return reply.status(404).send({ error: 'Không tìm thấy tài khoản' });
            }

            // Build update fields
            const updates = [];
            const params = [];

            if (fullName !== undefined) {
                updates.push('fullName = ?');
                params.push(fullName.trim());
            }

            if (email !== undefined && email !== currentUser.email) {
                // Validate email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return reply.status(400).send({ error: 'Email không hợp lệ' });
                }

                // Check uniqueness
                const existing = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
                if (existing) {
                    return reply.status(409).send({ error: 'Email này đã được sử dụng bởi tài khoản khác' });
                }

                updates.push('email = ?');
                params.push(email.trim());
            }

            if (updates.length === 0) {
                return reply.status(400).send({ error: 'Không có thông tin nào để cập nhật' });
            }

            params.push(userId);
            await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

            // Fetch updated user
            const updatedUser = await db.get(
                'SELECT id, username, email, fullName, role, balance, trial_balance, api_key, email_verified FROM users WHERE id = ?',
                [userId]
            );

            logger.info(`Profile updated: user ${userId} - fields: ${updates.join(', ')}`);
            return { errorId: 0, message: 'Cập nhật thông tin thành công!', user: updatedUser };
        } catch (err) {
            logger.error(`Update profile error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ============================================
    // Change Password (Protected)
    // ============================================
    fastify.put('/change-password', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { currentPassword, newPassword } = request.body || {};
        const userId = request.user.id;

        if (!currentPassword || !newPassword) {
            return reply.status(400).send({ error: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
        }

        if (newPassword.length < 6) {
            return reply.status(400).send({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        try {
            const user = await db.get('SELECT id, password FROM users WHERE id = ?', [userId]);
            if (!user) {
                return reply.status(404).send({ error: 'Không tìm thấy tài khoản' });
            }

            // Verify current password
            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) {
                return reply.status(401).send({ error: 'Mật khẩu hiện tại không đúng' });
            }

            // Hash new password and update
            const hashedNew = await bcrypt.hash(newPassword, 10);
            await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNew, userId]);

            logger.info(`Password changed: user ${userId}`);
            return { errorId: 0, message: 'Đổi mật khẩu thành công!' };
        } catch (err) {
            logger.error(`Change password error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ============================================
    // Forgot Password — sends reset code to email
    // ============================================
    fastify.post('/forgot-password', async (request, reply) => {
        const { email } = request.body || {};

        if (!email) {
            return reply.status(400).send({ error: 'Email là bắt buộc' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return reply.status(400).send({ error: 'Email không hợp lệ' });
        }

        try {
            const user = await db.get(
                'SELECT id, username, email, email_verified FROM users WHERE email = ?',
                [email]
            );

            // Always return success to prevent email enumeration
            if (!user) {
                return { errorId: 0, message: 'Nếu email tồn tại trong hệ thống, mã đặt lại mật khẩu sẽ được gửi.' };
            }

            if (!user.email_verified) {
                return reply.status(400).send({ error: 'Email chưa được xác thực. Vui lòng xác thực email trước.' });
            }

            const resetCode = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

            await db.run(
                'UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?',
                [resetCode, expiresAt, user.id]
            );

            const emailSent = await sendPasswordResetEmail(email, resetCode, user.username);

            logger.info(`Password reset code sent to ${email} - Sent: ${emailSent}`);
            return {
                errorId: 0,
                message: 'Mã đặt lại mật khẩu đã được gửi đến email của bạn.',
                emailSent
            };
        } catch (err) {
            logger.error(`Forgot password error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ============================================
    // Reset Password — verify code + set new password
    // ============================================
    fastify.post('/reset-password', async (request, reply) => {
        const { email, code, newPassword } = request.body || {};

        if (!email || !code || !newPassword) {
            return reply.status(400).send({ error: 'Email, mã xác thực và mật khẩu mới là bắt buộc' });
        }

        if (newPassword.length < 6) {
            return reply.status(400).send({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        try {
            const user = await db.get(
                'SELECT id, username, reset_code, reset_code_expires FROM users WHERE email = ?',
                [email]
            );

            if (!user) {
                return reply.status(404).send({ error: 'Email không tồn tại trong hệ thống' });
            }

            if (!user.reset_code) {
                return reply.status(400).send({ error: 'Chưa có yêu cầu đặt lại mật khẩu. Vui lòng yêu cầu lại.' });
            }

            // Check expiration
            if (new Date(user.reset_code_expires) < new Date()) {
                await db.run('UPDATE users SET reset_code = NULL, reset_code_expires = NULL WHERE id = ?', [user.id]);
                return reply.status(400).send({ error: 'Mã đặt lại đã hết hạn. Vui lòng yêu cầu mã mới.' });
            }

            // Check code
            if (user.reset_code !== code.trim()) {
                return reply.status(400).send({ error: 'Mã xác thực không đúng' });
            }

            // Hash new password and update
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.run(
                'UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?',
                [hashedPassword, user.id]
            );

            logger.info(`Password reset successful: ${user.username} (${email})`);
            return { errorId: 0, message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.' };
        } catch (err) {
            logger.error(`Reset password error: ${err.message}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ============================================
    // Google OAuth Login/Register
    // ============================================
    fastify.post('/google', async (request, reply) => {
        const { credential } = request.body || {};

        if (!credential) {
            return reply.status(400).send({ error: 'Google credential is required' });
        }

        try {
            // Verify Google token
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();
            const { email, name, picture, sub: googleId } = payload;

            if (!email) {
                return reply.status(400).send({ error: 'Không thể lấy email từ tài khoản Google' });
            }

            // Check if user exists with this email
            let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

            if (user) {
                // Existing user — update google_id if not set, and login
                if (!user.google_id) {
                    await db.run('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
                }

                // Ensure email is verified for Google users
                if (!user.email_verified) {
                    await db.run('UPDATE users SET email_verified = 1 WHERE id = ?', [user.id]);
                }
            } else {
                // New user — auto-register via Google
                const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 6);
                const apiKey = `cap_live_${uuidv4().replace(/-/g, '').substring(0, 20)}`;
                const randomPassword = await bcrypt.hash(uuidv4(), 10); // Random password (user uses Google to login)

                await db.run(
                    `INSERT INTO users (username, password, api_key, fullName, email, balance, trial_balance, email_verified, google_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [username, randomPassword, apiKey, name || '', email, 0.0, 100, 1, googleId]
                );

                user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
                logger.info(`New Google user registered: ${username} (${email})`);
            }

            // Check if account is locked
            if (user.is_locked) {
                return reply.status(403).send({ error: 'Tài khoản đã bị khóa. Vui lòng liên hệ admin.' });
            }

            // Generate JWT
            const token = fastify.jwt.sign({
                id: user.id,
                username: user.username,
                role: user.role || 'user'
            });

            const loginIp = request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.ip || '127.0.0.1';
            await db.run(
                'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?',
                [loginIp, user.id]
            );

            logger.info(`Google login: ${user.username} (${email}) from IP: ${loginIp}`);
            return {
                errorId: 0,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName || name,
                    role: user.role || 'user',
                    balance: user.balance,
                    trial_balance: user.trial_balance,
                    apiKey: user.api_key
                }
            };
        } catch (err) {
            logger.error(`Google auth error: ${err.message}`);
            if (err.message.includes('Token used too late') || err.message.includes('Invalid token')) {
                return reply.status(401).send({ error: 'Token Google không hợp lệ hoặc đã hết hạn' });
            }
            return reply.status(500).send({ error: 'Lỗi xác thực Google. Vui lòng thử lại.' });
        }
    });
}

export default authRoutes;
