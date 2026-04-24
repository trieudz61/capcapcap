import './env.js';
import { createClient } from '@libsql/client';
import logger from '../utils/logger.js';

// Connect to Turso (cloud) or fallback to local SQLite file
const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

let client;

if (dbUrl) {
    client = createClient({
        url: dbUrl,
        authToken: authToken,
    });
    logger.info(`☁️  Connected to Turso: ${dbUrl}`);
} else {
    // Fallback: local SQLite file for development
    import('path').then(async (pathMod) => {
        const { fileURLToPath } = await import('url');
        const __dirname = pathMod.dirname(fileURLToPath(import.meta.url));
        const localPath = pathMod.join(__dirname, '../../database.sqlite');
        client = createClient({ url: `file:${localPath}` });
        logger.info(`📂 Connected to local SQLite: ${localPath}`);
    });
}

/**
 * Convert libsql result rows to plain objects
 * libsql returns rows with column names, we convert to standard objects
 */
function rowsToObjects(result) {
    if (!result || !result.rows) return [];
    return result.rows.map(row => {
        const obj = {};
        for (const col of result.columns) {
            obj[col] = row[col];
        }
        return obj;
    });
}

// Helper: Execute query and return all rows as objects
export const query = async (sql, params = []) => {
    const result = await client.execute({ sql, args: params });
    return rowsToObjects(result);
};

// Helper: Execute query and return first row as object
export const get = async (sql, params = []) => {
    const result = await client.execute({ sql, args: params });
    const rows = rowsToObjects(result);
    return rows.length > 0 ? rows[0] : undefined;
};

// Helper: Execute write query, return { id, changes }
export const run = async (sql, params = []) => {
    const result = await client.execute({ sql, args: params });
    return {
        id: Number(result.lastInsertRowid) || 0,
        changes: result.rowsAffected || 0
    };
};

// Helper: Execute multiple statements (split by semicolons)
export const exec = async (sql) => {
    // Split SQL by semicolons and execute each statement
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
        await client.execute(stmt);
    }
};

/**
 * Transaction handler using libsql batch with transaction mode
 */
export const withTransaction = async (workFn, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const tx = await client.transaction('write');
        try {
            const txQuery = async (sql, params = []) => {
                const result = await tx.execute({ sql, args: params });
                return rowsToObjects(result);
            };
            const txGet = async (sql, params = []) => {
                const result = await tx.execute({ sql, args: params });
                const rows = rowsToObjects(result);
                return rows.length > 0 ? rows[0] : undefined;
            };
            const txRun = async (sql, params = []) => {
                const result = await tx.execute({ sql, args: params });
                return {
                    id: Number(result.lastInsertRowid) || 0,
                    changes: result.rowsAffected || 0
                };
            };

            // Temporarily swap exports for the duration of the transaction
            const savedQuery = module_exports.query;
            const savedGet = module_exports.get;
            const savedRun = module_exports.run;

            module_exports.query = txQuery;
            module_exports.get = txGet;
            module_exports.run = txRun;

            const result = await workFn();

            // Restore originals
            module_exports.query = savedQuery;
            module_exports.get = savedGet;
            module_exports.run = savedRun;

            await tx.commit();
            return result;
        } catch (err) {
            try { await tx.rollback(); } catch (_) {}
            const isRetryable = err.message?.includes('TRANSACTION_CLOSED')
                || err.message?.includes('404')
                || err.message?.includes('SERVER_ERROR');
            if (isRetryable && attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 100 * attempt)); // backoff
                continue;
            }
            throw err;
        }
    }
};

// Module exports object (mutable for transaction swapping)
const module_exports = { query, get, run, exec, withTransaction };

// Initialize Schema
async function initSchema() {
    logger.info('Initializing Database Schema...');

    try {
        // Create tables one by one (Turso doesn't support multi-statement exec well)
        await client.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT,
                fullName TEXT,
                api_key TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'user',
                balance DECIMAL(10, 4) DEFAULT 0.0,
                trial_balance INTEGER DEFAULT 100,
                is_locked INTEGER DEFAULT 0,
                last_login_at DATETIME,
                last_login_ip TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount DECIMAL(10, 4) NOT NULL,
                type TEXT CHECK(type IN ('credit', 'debit')) NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_id TEXT NOT NULL,
                task_type TEXT NOT NULL,
                cost DECIMAL(10, 4) NOT NULL,
                status TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS gift_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                amount DECIMAL(10, 4) NOT NULL,
                status TEXT DEFAULT 'unused',
                created_by INTEGER,
                used_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                used_at DATETIME
            )
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS pricing (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price DECIMAL(10, 6) NOT NULL,
                unit TEXT DEFAULT 'solve',
                description TEXT,
                speed TEXT DEFAULT '1-3s',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check columns (migration helper)
        const columns = await query("PRAGMA table_info(users)");
        const hasRole = columns.some(c => c.name === 'role');
        const hasPassword = columns.some(c => c.name === 'password');
        const hasFullName = columns.some(c => c.name === 'fullName');
        const hasTrialBalance = columns.some(c => c.name === 'trial_balance');
        const hasIsLocked = columns.some(c => c.name === 'is_locked');
        const hasLastLoginAt = columns.some(c => c.name === 'last_login_at');
        const hasLastLoginIp = columns.some(c => c.name === 'last_login_ip');

        if (!hasRole) await run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
        if (!hasPassword) await run("ALTER TABLE users ADD COLUMN password TEXT");
        if (!hasFullName) await run("ALTER TABLE users ADD COLUMN fullName TEXT");
        if (!hasTrialBalance) await run("ALTER TABLE users ADD COLUMN trial_balance INTEGER DEFAULT 100");
        if (!hasIsLocked) await run("ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0");
        if (!hasLastLoginAt) await run("ALTER TABLE users ADD COLUMN last_login_at DATETIME");
        if (!hasLastLoginIp) await run("ALTER TABLE users ADD COLUMN last_login_ip TEXT");

        // Email verification columns
        const hasEmail = columns.some(c => c.name === 'email');
        const hasEmailVerified = columns.some(c => c.name === 'email_verified');
        const hasVerificationCode = columns.some(c => c.name === 'verification_code');
        const hasVerificationExpires = columns.some(c => c.name === 'verification_expires');

        if (!hasEmail) await run("ALTER TABLE users ADD COLUMN email TEXT");
        if (!hasEmailVerified) await run("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0");
        if (!hasVerificationCode) await run("ALTER TABLE users ADD COLUMN verification_code TEXT");
        if (!hasVerificationExpires) await run("ALTER TABLE users ADD COLUMN verification_expires DATETIME");

        // Google OAuth column
        const hasGoogleId = columns.some(c => c.name === 'google_id');
        if (!hasGoogleId) await run("ALTER TABLE users ADD COLUMN google_id TEXT");

        // Password reset columns
        const hasResetCode = columns.some(c => c.name === 'reset_code');
        const hasResetCodeExpires = columns.some(c => c.name === 'reset_code_expires');
        if (!hasResetCode) await run("ALTER TABLE users ADD COLUMN reset_code TEXT");
        if (!hasResetCodeExpires) await run("ALTER TABLE users ADD COLUMN reset_code_expires DATETIME");

        // Auto-verify existing users (so admin isn't locked out)
        if (!hasEmailVerified) {
            await run("UPDATE users SET email_verified = 1 WHERE email_verified IS NULL OR email_verified = 0");
        }

        // Seed default pricing if empty
        const pricingCount = await get("SELECT count(*) as count FROM pricing");
        if (pricingCount.count === 0) {
            await run(
                "INSERT INTO pricing (name, price, unit, description, speed) VALUES (?, ?, ?, ?, ?)",
                ['ReCaptcha V2', 0.0005, 'solve', 'Google reCaptcha v2 checkbox', '1-3s']
            );
            await run(
                "INSERT INTO pricing (name, price, unit, description, speed) VALUES (?, ?, ?, ?, ?)",
                ['Turnstile', 0.001, 'solve', 'Cloudflare Turnstile (non-interactive & managed)', '~2s']
            );
            await run(
                "INSERT INTO pricing (name, price, unit, description, speed) VALUES (?, ?, ?, ?, ?)",
                ['ReCaptcha V3', 0.002, 'solve', 'Google reCaptcha v3 invisible', '1-2s']
            );
            logger.info('Default pricing seeded');
        } else {
            // Add Turnstile pricing if missing (for existing databases)
            const hasTurnstile = await get("SELECT id FROM pricing WHERE name LIKE '%Turnstile%' OR name LIKE '%turnstile%'");
            if (!hasTurnstile) {
                await run(
                    "INSERT INTO pricing (name, price, unit, description, speed) VALUES (?, ?, ?, ?, ?)",
                    ['Turnstile', 0.001, 'solve', 'Cloudflare Turnstile (non-interactive & managed)', '~2s']
                );
                logger.info('Turnstile pricing added');
            }
        }

        // Seed default notification if empty
        const notification = await get("SELECT * FROM settings WHERE key = 'notification'");
        if (!notification) {
            await run("INSERT INTO settings (key, value) VALUES (?, ?)", ['notification', '🎉 Welcome to Recap1s! High-speed captcha solving service.']);
            logger.info('Default notification seeded');
        }

    } catch (err) {
        logger.error(`Database initialization error: ${err.message}`);
    }
}

initSchema();

export default module_exports;
