import db from './connection.js';
import bcrypt from 'bcryptjs';

export function seedDefaultAdmin() {
    // Seed a SuperAdmin (Global)
    const existingSuper = db.prepare('SELECT id FROM users WHERE username = ? AND role = ?').get('super', 'superadmin');
    if (!existingSuper) {
        const hash = bcrypt.hashSync('super123', 10);
        db.prepare('INSERT INTO users (username, password_hash, full_name, role, tenant_id) VALUES (?, ?, ?, ?, ?)')
            .run('super', hash, 'Global Super Admin', 'superadmin', null);
        console.log('🌱 SuperAdmin created (super / super123)');
    }

    // Seed a Tenant Admin for the first tenant
    const tenant = db.prepare('SELECT id FROM tenants LIMIT 1').get();
    if (tenant) {
        const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ? AND tenant_id = ?').get('admin', tenant.id);
        if (!existingAdmin) {
            const hash = bcrypt.hashSync('admin123', 10);
            const branch = db.prepare('SELECT id FROM branches WHERE tenant_id = ? LIMIT 1').get(tenant.id);
            db.prepare('INSERT INTO users (username, password_hash, full_name, role, tenant_id, branch_id) VALUES (?, ?, ?, ?, ?, ?)')
                .run('admin', hash, 'Shop Admin', 'admin', tenant.id, branch?.id || null);
            console.log('🌱 Default tenant admin created (admin / admin123)');
        }
    }
}

export function seedSampleData() {
    const tenant = db.prepare('SELECT id FROM tenants LIMIT 1').get();
    if (!tenant) return;

    // Categories
    const categories = ['Groceries', 'Beverages', 'Snacks', 'Dairy', 'Personal Care', 'Stationery'];
    const insertCat = db.prepare('INSERT OR IGNORE INTO categories (tenant_id, name) VALUES (?, ?)');
    for (const c of categories) insertCat.run(tenant.id, c);

    // Sample products
    const products = [
        { name: 'Basmati Rice 1kg', barcode: '8901234001', cat: 'Groceries', cost: 85, sell: 110, qty: 50, unit: 'pcs', tax: 5 },
        { name: 'Toor Dal 1kg', barcode: '8901234002', cat: 'Groceries', cost: 120, sell: 150, qty: 40, unit: 'pcs', tax: 5 },
        { name: 'Sugar 1kg', barcode: '8901234003', cat: 'Groceries', cost: 38, sell: 45, qty: 60, unit: 'pcs', tax: 5 },
        { name: 'Coca-Cola 500ml', barcode: '8901234004', cat: 'Beverages', cost: 30, sell: 40, qty: 100, unit: 'pcs', tax: 18 },
        { name: 'Pepsi 500ml', barcode: '8901234005', cat: 'Beverages', cost: 30, sell: 40, qty: 80, unit: 'pcs', tax: 18 },
        { name: 'Green Tea 25 bags', barcode: '8901234006', cat: 'Beverages', cost: 90, sell: 120, qty: 30, unit: 'pcs', tax: 12 },
        { name: 'Lays Classic 52g', barcode: '8901234007', cat: 'Snacks', cost: 15, sell: 20, qty: 200, unit: 'pcs', tax: 12 },
        { name: 'Oreo Biscuit', barcode: '8901234008', cat: 'Snacks', cost: 22, sell: 30, qty: 150, unit: 'pcs', tax: 12 },
        { name: 'Amul Milk 500ml', barcode: '8901234009', cat: 'Dairy', cost: 25, sell: 29, qty: 3, unit: 'pcs', tax: 0 },
        { name: 'Paneer 200g', barcode: '8901234010', cat: 'Dairy', cost: 60, sell: 80, qty: 15, unit: 'pcs', tax: 0 },
        { name: 'Dove Soap 100g', barcode: '8901234011', cat: 'Personal Care', cost: 40, sell: 55, qty: 45, unit: 'pcs', tax: 18 },
        { name: 'Colgate 100g', barcode: '8901234012', cat: 'Personal Care', cost: 55, sell: 75, qty: 35, unit: 'pcs', tax: 18 },
        { name: 'Notebook A4', barcode: '8901234013', cat: 'Stationery', cost: 20, sell: 35, qty: 100, unit: 'pcs', tax: 12 },
        { name: 'Ball Pen (Pack of 5)', barcode: '8901234014', cat: 'Stationery', cost: 15, sell: 25, qty: 80, unit: 'pcs', tax: 12 },
    ];

    const getCatId = db.prepare('SELECT id FROM categories WHERE name = ? AND tenant_id = ?');
    const insertProd = db.prepare(`
        INSERT OR IGNORE INTO products (tenant_id, name, barcode, category_id, cost_price, selling_price, quantity, low_stock_threshold, unit, tax_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of products) {
        const cat = getCatId.get(p.cat, tenant.id);
        insertProd.run(tenant.id, p.name, p.barcode, cat?.id, p.cost, p.sell, p.qty, 5, p.unit, p.tax);
    }

    console.log('🌱 Sample data seeded for tenant: ' + tenant.id);
}

// Run if executed directly
const isMain = process.argv[1]?.endsWith('seed.js');
if (isMain) {
    const { initializeDatabase } = await import('./init.js');
    initializeDatabase();
    seedDefaultAdmin();
    seedSampleData();
}
