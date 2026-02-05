
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const createAdmin = async () => {
    const username = 'trieu82mh';
    const password = 'Trieu123';
    const fullName = 'Admin Trieu';

    console.log(`Creating admin account: ${username}`);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const apiKey = `cap_live_${uuidv4().replace(/-/g, '').substring(0, 20)}`;

        db.serialize(() => {
            // Check if user exists
            db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    console.error('Error checking user:', err);
                    return;
                }

                if (row) {
                    console.log('User exists, updating password and role...');
                    db.run('UPDATE users SET password = ?, role = "admin", balance = 999.0 WHERE username = ?', [hashedPassword, username], (err) => {
                        if (err) console.error('Update failed:', err);
                        else console.log('Admin updated successfully!');
                    });
                } else {
                    console.log('Creating new admin user...');
                    db.run('INSERT INTO users (username, password, api_key, fullName, role, balance) VALUES (?, ?, ?, ?, "admin", 999.0)',
                        [username, hashedPassword, apiKey, fullName],
                        (err) => {
                            if (err) console.error('Insert failed:', err);
                            else console.log('Admin created successfully!');
                        }
                    );
                }
            });
        });

    } catch (err) {
        console.error('Error:', err);
    }
};

createAdmin();
