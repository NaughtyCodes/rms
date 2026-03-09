import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, './data/shop.db');
const db = new Database(dbPath);

const tables = ['categories', 'products', 'invoices', 'settings', 'taxes'];

for (const table of tables) {
    console.log(`\nColumns for ${table}:`);
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    console.log(info.map(c => c.name).join(', '));
}

db.close();
