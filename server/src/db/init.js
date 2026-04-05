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
    
    // Seed and verify Global and Tenant configurations
    seedConfiguration();
}

function seedConfiguration() {
    try {
        // 1. Seed Global App Configurations into 'app_config' 
        const globalConfigs = [
            { key: 'app_version', value: '1.0.0', description: 'Application Version', type: 'string' },
            { key: 'maintenance_mode', value: 'false', description: 'Enable Maintenance Mode', type: 'boolean' },
            { key: 'allow_tenant_registration', value: 'true', description: 'Allow new tenants to sign up', type: 'boolean' },
            { key: 'system_email_from', value: 'noreply@tractly.app', description: 'System sender email address', type: 'string' }
        ];

        const insertAppConfig = db.prepare('INSERT OR IGNORE INTO app_config (key, value, description, type) VALUES (?, ?, ?, ?)');
        db.transaction((configs) => {
            for (const cfg of configs) {
                insertAppConfig.run(cfg.key, cfg.value, cfg.description, cfg.type);
            }
        })(globalConfigs);

        console.log('✅ Verified Global Application metadata');

        // 2. Seed Baseline Tenant-Specific Settings into 'settings' for all existing tenants
        const defaultTenantSettings = [
            { key: 'currency', value: 'USD' },
            { key: 'timezone', value: 'UTC' },
            { key: 'locale', value: 'en-US' },
            { key: 'receipt_footer', value: 'Thank you for your business!' }
        ];

        const tenants = db.prepare('SELECT id FROM tenants').all();
        const insertTenantSetting = db.prepare('INSERT OR IGNORE INTO settings (tenant_id, key, value) VALUES (?, ?, ?)');
        
        db.transaction((tList) => {
            for (const t of tList) {
                for (const setCfg of defaultTenantSettings) {
                    insertTenantSetting.run(t.id, setCfg.key, setCfg.value);
                }
            }
        })(tenants);

        console.log('✅ Verified Baseline Tenant Metadata');

    } catch (err) {
        console.error('Error seeding metadata configuration:', err.message);
    }
}
