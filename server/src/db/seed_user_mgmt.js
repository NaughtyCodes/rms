import db from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const permissions = [
    // General
    { name: 'view_dashboard', category: 'general', description: 'Access the main dashboard' },
    { name: 'manage_settings', category: 'general', description: 'Configure application settings' },
    { name: 'manage_shop_config', category: 'general', description: 'Settings related to the shop' },
    { name: 'manage_print_config', category: 'general', description: 'Settings for bill/receipt printing' },

    // Billing
    { name: 'access_billing', category: 'billing', description: 'Open the billing terminal' },
    { name: 'view_invoices', category: 'billing', description: 'View past invoices' },
    { name: 'delete_invoices', category: 'billing', description: 'Delete or void invoices' },

    // Inventory
    { name: 'view_inventory', category: 'inventory', description: 'View stock levels' },
    { name: 'manage_inventory', category: 'inventory', description: 'Adjust stock levels and batches' },
    { name: 'transfer_stock', category: 'inventory', description: 'Transfer stock between branches' },
    { name: 'view_low_stock', category: 'inventory', description: 'Access low stock alerts' },

    // Products
    { name: 'manage_products', category: 'products', description: 'Create, update, and delete products' },
    { name: 'manage_categories', category: 'products', description: 'Manage product categories' },
    { name: 'manage_taxes', category: 'products', description: 'Configure tax rates' },
    { name: 'manage_discounts', category: 'products', description: 'Set up product discounts' },
    { name: 'manage_meta_fields', category: 'products', description: 'Configure custom product fields' },

    // Infrastructure
    { name: 'manage_branches', category: 'infrastructure', description: 'Add or edit shop branches' },

    // Reports
    { name: 'view_sales_reports', category: 'reports', description: 'Access sales analytics and reports' },
    { name: 'export_reports', category: 'reports', description: 'Download reports as CSV/PDF' },

    // Administration
    { name: 'manage_users', category: 'admin', description: 'User management' },
    { name: 'manage_roles', category: 'admin', description: 'Create and assign roles' },
    { name: 'manage_permissions', category: 'admin', description: 'Map permissions to roles' },

    // Superadmin
    { name: 'manage_tenants', category: 'superadmin', description: 'System-wide tenant management' }
];

function seed() {
    try {
        console.log('Executing schema...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        db.exec(schema);
        console.log('✅ Database schema initialized');

        console.log('Seeding Permissions...');
        const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (name, category, description) VALUES (?, ?, ?)');
        const transaction = db.transaction((perms) => {
            for (const p of perms) insertPerm.run(p.name, p.category, p.description);
        });
        transaction(permissions);
        console.log('Permissions seeded successfully.');

        // Add default system roles for each tenant if they don't exist
        const tenants = db.prepare('SELECT id FROM tenants').all();
        console.log(`Setting up default roles for ${tenants.length} tenants...`);

        for (const tenant of tenants) {
            const tenant_id = tenant.id;

            // Admin Role
            const roleResult = db.prepare('INSERT OR IGNORE INTO roles (tenant_id, name, description, is_system_role) VALUES (?, ?, ?, ?)')
                .run(tenant_id, 'Admin', 'Full administrative access', 1);
            
            if (roleResult.changes > 0) {
                const roleId = roleResult.lastInsertRowid;
                // Assign all permissions except manage_tenants to Admin
                const sysPerms = db.prepare("SELECT id FROM permissions WHERE category != 'superadmin'").all();
                const insertRolePerm = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
                for (const p of sysPerms) insertRolePerm.run(roleId, p.id);
            }

            // Cashier Role
            const cashierResult = db.prepare('INSERT OR IGNORE INTO roles (tenant_id, name, description, is_system_role) VALUES (?, ?, ?, ?)')
                .run(tenant_id, 'Cashier', 'Basic billing and inventory viewing', 1);
                
            if (cashierResult.changes > 0) {
                const roleId = cashierResult.lastInsertRowid;
                const cashierPermNames = ['view_dashboard', 'access_billing', 'view_invoices', 'view_inventory'];
                const cashierPerms = db.prepare(`SELECT id FROM permissions WHERE name IN (${cashierPermNames.map(() => '?').join(',')})`)
                    .all(...cashierPermNames);
                const insertRolePerm = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
                for (const p of cashierPerms) insertRolePerm.run(roleId, p.id);
            }
        }

        // Migrate existing users' roles to the new system
        console.log('Migrating existing user roles...');
        const users = db.prepare('SELECT id, tenant_id, role FROM users WHERE role IS NOT NULL').all();
        for (const user of users) {
             // Find the corresponding role in the new roles table
             const roleName = user.role.charAt(0).toUpperCase() + user.role.slice(1); // cashier -> Cashier
             const role = db.prepare('SELECT id FROM roles WHERE tenant_id = ? AND name = ?').get(user.tenant_id, roleName);
             if (role) {
                 db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(user.id, role.id);
             }
        }

        console.log('User management seeding completed.');
    } catch (err) {
        console.error('Error seeding:', err);
    }
}

seed();
