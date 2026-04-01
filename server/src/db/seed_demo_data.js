import db from './connection.js';
import bcrypt from 'bcryptjs';

async function seedDemoData() {
    console.log('🌱 Starting Demo Data Seeding...');
    
    // 1. Ensure Schema and baseline exist
    try {
        db.prepare('SELECT id FROM tenants LIMIT 1').get();
    } catch {
        console.log('Running init...');
        const { initializeDatabase } = await import('./init.js');
        initializeDatabase();
    }

    const hash = bcrypt.hashSync('admin123', 10);

    // --- TENANT 1: TechStore ---
    console.log('🛍️ Creating Tenant: TechStore Inc');
    const t1 = db.prepare('INSERT INTO tenants (name, slug, plan) VALUES (?, ?, ?)')
        .run('TechStore Inc', 'techstore', 'enterprise');
    const t1Id = t1.lastInsertRowid;

    const t1b1 = db.prepare('INSERT INTO branches (tenant_id, name, is_warehouse, is_active) VALUES (?, ?, ?, ?)').run(t1Id, 'TechStore Main', 1, 1).lastInsertRowid;
    const t1b2 = db.prepare('INSERT INTO branches (tenant_id, name, is_warehouse, is_active) VALUES (?, ?, ?, ?)').run(t1Id, 'TechStore Downtown', 0, 1).lastInsertRowid;

    db.prepare('INSERT INTO users (username, password_hash, full_name, role, tenant_id, branch_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run('tech_admin', hash, 'Tech Admin', 'admin', t1Id, t1b1);
    const u1 = db.prepare('SELECT last_insert_rowid() as id').get().id;

    // Categories and Products for TechStore
    const c1 = db.prepare('INSERT INTO categories (tenant_id, name) VALUES (?, ?)').run(t1Id, 'Laptops').lastInsertRowid;
    const c2 = db.prepare('INSERT INTO categories (tenant_id, name) VALUES (?, ?)').run(t1Id, 'Accessories').lastInsertRowid;

    const p1 = db.prepare('INSERT INTO products (tenant_id, name, barcode, category_id, cost_price, selling_price, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(t1Id, 'MacBook Pro 16', 'TS-MBP16', c1, 2000, 2400, 50, 'pcs').lastInsertRowid;
    const p2 = db.prepare('INSERT INTO products (tenant_id, name, barcode, category_id, cost_price, selling_price, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(t1Id, 'Dell XPS 15', 'TS-XPS15', c1, 1500, 1800, 30, 'pcs').lastInsertRowid;
    const p3 = db.prepare('INSERT INTO products (tenant_id, name, barcode, category_id, cost_price, selling_price, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(t1Id, 'USB-C Hub', 'TS-HUB1', c2, 20, 45, 200, 'pcs').lastInsertRowid;

    // Branch Stock
    db.prepare('INSERT INTO branch_stock (tenant_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(t1Id, t1b1, p1, 30);
    db.prepare('INSERT INTO branch_stock (tenant_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(t1Id, t1b2, p1, 20);
    db.prepare('INSERT INTO branch_stock (tenant_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(t1Id, t1b1, p2, 15);
    db.prepare('INSERT INTO branch_stock (tenant_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(t1Id, t1b2, p2, 15);


    // --- TENANT 2: SuperMart ---
    console.log('🛒 Creating Tenant: SuperMart');
    const t2 = db.prepare('INSERT INTO tenants (name, slug, plan) VALUES (?, ?, ?)')
        .run('SuperMart', 'supermart', 'pro');
    const t2Id = t2.lastInsertRowid;

    const t2b1 = db.prepare('INSERT INTO branches (tenant_id, name, is_warehouse, is_active) VALUES (?, ?, ?, ?)').run(t2Id, 'SuperMart Flagship', 1, 1).lastInsertRowid;
    const t2b2 = db.prepare('INSERT INTO branches (tenant_id, name, is_warehouse, is_active) VALUES (?, ?, ?, ?)').run(t2Id, 'SuperMart Express', 0, 1).lastInsertRowid;

    db.prepare('INSERT INTO users (username, password_hash, full_name, role, tenant_id, branch_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run('mart_admin', hash, 'Mart Admin', 'admin', t2Id, t2b1);
    const u2 = db.prepare('SELECT last_insert_rowid() as id').get().id;

    // Categories and Products for SuperMart
    const c3 = db.prepare('INSERT INTO categories (tenant_id, name) VALUES (?, ?)').run(t2Id, 'Groceries').lastInsertRowid;
    
    const p4 = db.prepare('INSERT INTO products (tenant_id, name, barcode, category_id, cost_price, selling_price, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(t2Id, 'Organic Apples', 'SM-APP1', c3, 1, 3, 500, 'kg').lastInsertRowid;
    const p5 = db.prepare('INSERT INTO products (tenant_id, name, barcode, category_id, cost_price, selling_price, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(t2Id, 'Whole Milk 1L', 'SM-MLK1', c3, 0.8, 1.5, 300, 'pcs').lastInsertRowid;

    // Branch Stock
    db.prepare('INSERT INTO branch_stock (tenant_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(t2Id, t2b1, p4, 300);
    db.prepare('INSERT INTO branch_stock (tenant_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(t2Id, t2b2, p4, 200);


    // --- INVOICES (Backdated Data) ---
    console.log('🧾 Generating Backdated Invoices...');
    const insertInvoice = db.prepare('INSERT INTO invoices (tenant_id, invoice_number, user_id, branch_id, subtotal, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertInvoiceItem = db.prepare('INSERT INTO invoice_items (tenant_id, invoice_id, product_id, product_name, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)');

    const generateInvoices = (tenant, user, branch, products, prefix) => {
        const now = new Date();
        for (let i = 0; i < 30; i++) {
            // Generate random date within the last 60 days
            const pastDate = new Date(now.getTime() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000));
            const dateStr = pastDate.toISOString();
            
            const prod = products[Math.floor(Math.random() * products.length)];
            const qty = Math.floor(Math.random() * 3) + 1;
            const total = prod.price * qty;

            const inv = insertInvoice.run(tenant, `${prefix}-${1000 + i}`, user, branch, total, total, dateStr).lastInsertRowid;
            insertInvoiceItem.run(tenant, inv, prod.id, prod.name, qty, prod.price, total);
        }
    };

    generateInvoices(t1Id, u1, t1b1, [{id: p1, name: 'MacBook Pro 16', price: 2400}, {id: p2, name: 'Dell XPS 15', price: 1800}], 'INV-TS1');
    generateInvoices(t1Id, u1, t1b2, [{id: p3, name: 'USB-C Hub', price: 45}], 'INV-TS2');
    
    generateInvoices(t2Id, u2, t2b1, [{id: p4, name: 'Organic Apples', price: 3}, {id: p5, name: 'Whole Milk 1L', price: 1.5}], 'INV-SM1');

    console.log('✅ Demo Data Seeding Complete!');
}

seedDemoData().catch(err => console.error(err));
