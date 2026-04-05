import db from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function migrate() {
    try {
        console.log('Starting RBAC migration...');
        
        // 1. Rename old tables
        db.exec(`
            ALTER TABLE role_permissions RENAME TO role_permissions_old;
            ALTER TABLE user_roles RENAME TO user_roles_old;
        `);
        console.log('Renamed old tables');

        // 2. Recreate schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        db.exec(schema);
        console.log('Recreated schema with tenant_id');

        // 3. Migrate data
        db.exec(`
            INSERT INTO role_permissions (tenant_id, role_id, permission_id) 
            SELECT r.tenant_id, rp.role_id, rp.permission_id 
            FROM role_permissions_old rp 
            JOIN roles r ON r.id = rp.role_id;
            
            INSERT INTO user_roles (tenant_id, user_id, role_id) 
            SELECT r.tenant_id, ur.user_id, ur.role_id 
            FROM user_roles_old ur 
            JOIN roles r ON r.id = ur.role_id;
        `);
        console.log('Migrated data into new tables');

        // 4. Drop old tables
        db.exec(`
            DROP TABLE role_permissions_old;
            DROP TABLE user_roles_old;
        `);
        console.log('Migration complete!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

migrate();
