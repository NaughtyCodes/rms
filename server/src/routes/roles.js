import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/roles
router.get('/', authenticate, authorizeAdmin, (req, res) => {
    try {
        const roles = db.prepare('SELECT id, name, description, is_system_role FROM roles WHERE tenant_id = ?').all(req.tenantId);
        
        // Fetch permissions for each role
        const fullRoles = roles.map(role => {
            const perms = db.prepare(`
                SELECT p.name FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = ?
            `).all(role.id).map(p => p.name);
            return { ...role, permissions: perms };
        });

        res.json(fullRoles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/roles
router.post('/', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        if (!name) return res.status(400).json({ error: 'Role name is required.' });

        // Start transaction
        const roleResult = db.transaction(() => {
            const result = db.prepare('INSERT INTO roles (tenant_id, name, description) VALUES (?, ?, ?)')
                .run(req.tenantId, name, description || '');
            const roleId = result.lastInsertRowid;

            if (permissions && Array.isArray(permissions)) {
                const insertRP = db.prepare('INSERT INTO role_permissions (tenant_id, role_id, permission_id) VALUES (?, ?, ?)');
                const findPerm = db.prepare('SELECT id FROM permissions WHERE name = ?');
                for (const pName of permissions) {
                    const perm = findPerm.get(pName);
                    if (perm) insertRP.run(req.tenantId, roleId, perm.id);
                }
            }
            return roleId;
        })();

        res.status(201).json({ id: roleResult, name, permissions: permissions || [] });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Role name already exists.' });
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/roles/:id
router.put('/:id', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;

        const role = db.prepare('SELECT id, is_system_role FROM roles WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!role) return res.status(404).json({ error: 'Role not found.' });
        
        // System roles might have restrictions on name/deletion
        if (role.is_system_role && name && name !== role.name) {
             // Optional: prevent changing system role names
        }

        db.transaction(() => {
            db.prepare('UPDATE roles SET name = ?, description = ? WHERE id = ? AND tenant_id = ?')
                .run(name || 'Unnamed', description || '', id, req.tenantId);

            if (permissions && Array.isArray(permissions)) {
                // Remove old permissions
                db.prepare('DELETE FROM role_permissions WHERE role_id = ? AND tenant_id = ?').run(id, req.tenantId);
                // Add new ones
                const insertRP = db.prepare('INSERT INTO role_permissions (tenant_id, role_id, permission_id) VALUES (?, ?, ?)');
                const findPerm = db.prepare('SELECT id FROM permissions WHERE name = ?');
                for (const pName of permissions) {
                    const perm = findPerm.get(pName);
                    if (perm) insertRP.run(req.tenantId, id, perm.id);
                }
            }
        })();

        res.json({ id, name, permissions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/roles/:id
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const role = db.prepare('SELECT id, is_system_role FROM roles WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!role) return res.status(404).json({ error: 'Role not found.' });
        if (role.is_system_role) return res.status(403).json({ error: 'System roles cannot be deleted.' });

        db.prepare('DELETE FROM roles WHERE id = ? AND tenant_id = ?').run(id, req.tenantId);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
