import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// ============================================
// SMTP Transporter (Hostinger)
// ============================================
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // SSL
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify connection on startup
transporter.verify().then(() => {
    logger.info('📧 SMTP connected: ' + process.env.SMTP_USER);
}).catch(err => {
    logger.error('📧 SMTP connection failed: ' + err.message);
});

// ============================================
// Generate 6-digit verification code
// ============================================
export function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================
// Send Verification Email
// ============================================
export async function sendVerificationEmail(to, code, username) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    <div style="max-width:480px;margin:40px auto;background:#111827;border-radius:24px;overflow:hidden;border:1px solid #1e293b;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:40px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px;">
                Recap<span style="color:#bfdbfe;">1s</span>
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;">
                Captcha Solver Platform
            </p>
        </div>

        <!-- Content -->
        <div style="padding:40px 32px;">
            <p style="color:#94a3b8;font-size:14px;margin:0 0 8px;">
                Xin chào <strong style="color:#e2e8f0;">${username || 'bạn'}</strong>,
            </p>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 32px;line-height:1.6;">
                Dùng mã xác thực bên dưới để hoàn tất đăng ký tài khoản Recap1s của bạn.
            </p>

            <!-- OTP Code -->
            <div style="background:#0a0f1e;border:2px dashed #334155;border-radius:16px;padding:24px;text-align:center;margin-bottom:32px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
                    Mã Xác Thực
                </p>
                <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#38bdf8;font-family:monospace;">
                    ${code}
                </div>
            </div>

            <p style="color:#64748b;font-size:12px;margin:0 0 6px;">
                ⏰ Mã có hiệu lực trong <strong style="color:#e2e8f0;">10 phút</strong>.
            </p>
            <p style="color:#64748b;font-size:12px;margin:0;">
                🔒 Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.
            </p>
        </div>

        <!-- Footer -->
        <div style="padding:20px 32px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0;color:#475569;font-size:11px;">
                © ${new Date().getFullYear()} Recap1s — recap1s.com
            </p>
        </div>
    </div>
</body>
</html>`;

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Recap1s <support@recap1s.com>',
            to,
            subject: `[Recap1s] Mã xác thực: ${code}`,
            html,
        });

        logger.info(`📧 Verification email sent to ${to} (messageId: ${info.messageId})`);
        return true;
    } catch (err) {
        logger.error(`📧 Failed to send email to ${to}: ${err.message}`);
        return false;
    }
}
// ============================================
// Send Password Reset Email
// ============================================
export async function sendPasswordResetEmail(to, code, username) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    <div style="max-width:480px;margin:40px auto;background:#111827;border-radius:24px;overflow:hidden;border:1px solid #1e293b;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:40px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px;">
                Recap<span style="color:#fef3c7;">1s</span>
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;">
                Đặt lại mật khẩu
            </p>
        </div>

        <!-- Content -->
        <div style="padding:40px 32px;">
            <p style="color:#94a3b8;font-size:14px;margin:0 0 8px;">
                Xin chào <strong style="color:#e2e8f0;">${username || 'bạn'}</strong>,
            </p>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 32px;line-height:1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Sử dụng mã bên dưới để tiếp tục.
            </p>

            <!-- OTP Code -->
            <div style="background:#0a0f1e;border:2px dashed #334155;border-radius:16px;padding:24px;text-align:center;margin-bottom:32px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
                    Mã Đặt Lại Mật Khẩu
                </p>
                <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#f59e0b;font-family:monospace;">
                    ${code}
                </div>
            </div>

            <p style="color:#64748b;font-size:12px;margin:0 0 6px;">
                ⏰ Mã có hiệu lực trong <strong style="color:#e2e8f0;">10 phút</strong>.
            </p>
            <p style="color:#64748b;font-size:12px;margin:0;">
                🔒 Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
            </p>
        </div>

        <!-- Footer -->
        <div style="padding:20px 32px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0;color:#475569;font-size:11px;">
                © ${new Date().getFullYear()} Recap1s — recap1s.com
            </p>
        </div>
    </div>
</body>
</html>`;

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Recap1s <support@recap1s.com>',
            to,
            subject: `[Recap1s] Đặt lại mật khẩu: ${code}`,
            html,
        });

        logger.info(`📧 Password reset email sent to ${to} (messageId: ${info.messageId})`);
        return true;
    } catch (err) {
        logger.error(`📧 Failed to send password reset email to ${to}: ${err.message}`);
        return false;
    }
}

export default { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail };
