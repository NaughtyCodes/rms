import db from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initializeDatabase() {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);
    
    // Run schema migration for new columns on existing tables
    try {
        db.exec('ALTER TABLE products ADD COLUMN tax_rate REAL DEFAULT 0;');
        console.log('✅ Migrated: Added tax_rate to products table');
    } catch (err) {
        if (!err.message.includes('duplicate column name')) {
            console.error('Error migrating products table:', err.message);
        }
    }

    try {
        db.exec('ALTER TABLE categories ADD COLUMN tax_rate REAL DEFAULT 0;');
        console.log('✅ Migrated: Added tax_rate to categories table');
    } catch (err) {
        if (!err.message.includes('duplicate column name')) {
            console.error('Error migrating categories table:', err.message);
        }
    }
    
    console.log('✅ Database schema initialized');
}
