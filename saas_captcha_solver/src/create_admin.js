
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to Turso or local SQLite
const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

let client;
if (dbUrl) {
    client = createClient({ url: dbUrl, authToken });
    console.log(`☁️  Connected to Turso: ${dbUrl}`);
} else {
    const localPath = path.join(__dirname, '../database.sqlite');
    client = createClient({ url: `file:${localPath}` });
    console.log(`📂 Using local database: ${localPath}`);
}

const createAdmin = async () => {
    const username = 'trieu82mh';
    const password = 'Trieu123';
    const fullName = 'Admin Trieu';

    console.log(`Creating admin account: ${username}`);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const apiKey = `cap_live_${uuidv4().replace(/-/g, '').substring(0, 20)}`;

        // Check if user exists
        const result = await client.execute({
            sql: 'SELECT id FROM users WHERE username = ?',
            args: [username]
        });

        if (result.rows.length > 0) {
            console.log('User exists, updating password and role...');
            await client.execute({
                sql: 'UPDATE users SET password = ?, role = "admin", balance = 999.0 WHERE username = ?',
                args: [hashedPassword, username]
            });
            console.log('Admin updated successfully!');
        } else {
            console.log('Creating new admin user...');
            await client.execute({
                sql: 'INSERT INTO users (username, password, api_key, fullName, role, balance) VALUES (?, ?, ?, ?, "admin", 999.0)',
                args: [username, hashedPassword, apiKey, fullName]
            });
            console.log('Admin created successfully!');
        }
    } catch (err) {
        console.error('Error:', err);
    }

    process.exit(0);
};

createAdmin();
