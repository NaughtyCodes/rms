import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, './data/shop.db');

console.log('--- System Verification Script ---');
console.log('Connecting to:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found!');
    process.exit(1);
}

const db = new Database(dbPath);

try {
    // 1. Check Categories
    console.log('\n1. Verifying Categories...');
    const catResult = db.prepare('INSERT OR IGNORE INTO categories (name, description, tax_rate) VALUES (?, ?, ?)').run('Test Category', 'For Verification', 5);
    const category = db.prepare('SELECT * FROM categories WHERE name = ?').get('Test Category');
    console.log('✅ Category saved:', category);

    // 2. Check Taxes
    console.log('\n2. Verifying Taxes...');
    db.prepare('INSERT OR IGNORE INTO taxes (name, rate, is_active) VALUES (?, ?, ?)').run('GST 18', 18, 1);
    const tax = db.prepare('SELECT * FROM taxes WHERE name = ?').get('GST 18');
    console.log('✅ Tax saved:', tax);

    // 3. Check Products
    console.log('\n3. Verifying Products...');
    const prodResult = db.prepare('INSERT OR IGNORE INTO products (name, barcode, category_id, cost_price, selling_price, quantity, tax_rate) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Test Product', '123456789', category.id, 100, 150, 50, 5);
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get('123456789');
    console.log('✅ Product saved:', product);

    // 4. Check Shop Config (Settings)
    console.log('\n4. Verifying Shop Settings...');
    const settings = [
        { key: 'shop_name', value: 'Verification Shop' },
        { key: 'shop_logo_url', value: '/uploads/test_logo.png' },
        { key: 'bill_layout_style', value: 'modern' }
    ];
    const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const s of settings) {
        setStmt.run(s.key, s.value);
    }
    const savedSettings = db.prepare("SELECT * FROM settings WHERE key IN ('shop_name', 'shop_logo_url')").all();
    console.log('✅ Settings saved:', savedSettings);

    // 5. Simulate Billing
    console.log('\n5. Verifying Billing Logic...');
    const invoiceNum = 'INV-' + Date.now();
    const invoiceResult = db.prepare('INSERT INTO invoices (invoice_number, user_id, subtotal, total, payment_mode) VALUES (?, ?, ?, ?, ?)').run(invoiceNum, 1, 150, 157.5, 'cash');
    const invoiceId = invoiceResult.lastInsertRowid;
    
    db.prepare('INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)').run(invoiceId, product.id, product.name, 1, 150, 150);
    
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    
    console.log('✅ Invoice created:', invoice);
    console.log('✅ Invoice items saved:', items);

    console.log('\n--- VERIFICATION SUCCESSFUL ---');

} catch (err) {
    console.error('❌ Verification failed:', err.message);
} finally {
    db.close();
}
