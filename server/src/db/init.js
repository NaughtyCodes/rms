import db from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initializeDatabase() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // For a clean SaaS migration, we execute the schema. 
    // Note: In a production app, we would use proper migrations.
    try {
        db.exec(schema);
        console.log('✅ Database schema initialized');
    } catch (err) {
        console.error('Error initializing schema:', err.message);
    }
    
    // Seed default Tenant, Branch and SuperAdmin if system is empty
    try {
        const tenantCount = db.prepare('SELECT COUNT(*) as count FROM tenants').get().count;
        if (tenantCount === 0) {
            // Create Default Tenant
            const insertTenant = db.prepare('INSERT INTO tenants (name, slug, plan) VALUES (?, ?, ?)');
            const tenantInfo = insertTenant.run('Default Shop', 'default', 'pro');
            const tenantId = tenantInfo.lastInsertRowid;
            console.log('✅ Created default tenant: Default Shop');

            // Create default branch for this tenant
            const insertBranch = db.prepare('INSERT INTO branches (tenant_id, name, is_warehouse, is_active) VALUES (?, ?, ?, ?)');
            const brInfo = insertBranch.run(tenantId, 'Main Branch', 1, 1);
            const branchId = brInfo.lastInsertRowid;
            console.log('✅ Created default branch for tenant');

            // Note: Users will be seeded in seed.js
        }
    } catch (err) {
        console.error('Error seeding initial multi-tenant foundations:', err.message);
    }
}
