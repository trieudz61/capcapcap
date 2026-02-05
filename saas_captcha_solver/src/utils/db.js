import sqlite3 from 'sqlite3';
import logger from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath);

// Enable WAL mode for better write concurrency
db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA synchronous=NORMAL');
db.run('PRAGMA cache_size=10000'); // 10MB cache

// Helper for Async Queries
export const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

export const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

export const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

export const exec = (sql) => {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// Initialize Schema
async function initSchema() {
    logger.info('Initializing Database Schema...');

    try {
        await exec(`
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
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount DECIMAL(10, 4) NOT NULL,
                type TEXT CHECK(type IN ('credit', 'debit')) NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_id TEXT NOT NULL,
                task_type TEXT NOT NULL,
                cost DECIMAL(10, 4) NOT NULL,
                status TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS gift_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                amount DECIMAL(10, 4) NOT NULL,
                status TEXT DEFAULT 'unused', -- 'unused', 'used'
                created_by INTEGER,
                used_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                used_at DATETIME
            );
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

        if (!hasRole) await exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
        if (!hasPassword) await exec("ALTER TABLE users ADD COLUMN password TEXT");
        if (!hasFullName) await exec("ALTER TABLE users ADD COLUMN fullName TEXT");
        if (!hasTrialBalance) await exec("ALTER TABLE users ADD COLUMN trial_balance INTEGER DEFAULT 100");
        if (!hasIsLocked) await exec("ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0");
        if (!hasLastLoginAt) await exec("ALTER TABLE users ADD COLUMN last_login_at DATETIME");
        if (!hasLastLoginIp) await exec("ALTER TABLE users ADD COLUMN last_login_ip TEXT");

        // Create pricing table
        await exec(`
            CREATE TABLE IF NOT EXISTS pricing (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price DECIMAL(10, 6) NOT NULL,
                unit TEXT DEFAULT 'solve',
                description TEXT,
                speed TEXT DEFAULT '1-3s',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed default pricing if empty
        const pricingCount = await get("SELECT count(*) as count FROM pricing");
        if (pricingCount.count === 0) {
            await exec(`
                INSERT INTO pricing (name, price, unit, description, speed) VALUES
                ('ReCaptcha V2', 0.0005, 'solve', 'Google reCaptcha v2 checkbox', '1-3s'),
                ('ReCaptcha V3', 0.002, 'solve', 'Google reCaptcha v3 invisible', '1-2s')
            `);
            logger.info('Default pricing seeded');
        }

        // Create settings table
        await exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

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

export default { query, get, run, exec };
