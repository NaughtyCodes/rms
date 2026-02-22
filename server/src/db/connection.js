import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbDir = process.env.VERCEL
    ? '/tmp'
    : path.resolve(__dirname, '../../data');

if (!process.env.VERCEL && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(dbDir, 'shop.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
