import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/user-management
router.get('/', authenticate, authorizeAdmin, (req, res) => {
    try {
        const users = db.prepare('SELECT id, username, full_name, role, branch_id, created_at FROM users WHERE tenant_id = ?').all(req.tenantId);
        
        // Fetch roles for each user
        const fullUsers = users.map(user => {
            const roles = db.prepare(`
                SELECT r.id, r.name FROM roles r
                JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = ?
            `).all(user.id);
            return { ...user, roles };
        });

        res.json(fullUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/user-management
router.post('/', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { username, password, fullName, branchId, roles } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

        const hash = bcrypt.hashSync(password, 10);
        
        const userResult = db.transaction(() => {
            const result = db.prepare(
                'INSERT INTO users (username, password_hash, full_name, branch_id, tenant_id) VALUES (?, ?, ?, ?, ?)'
            ).run(username, hash, fullName || '', branchId || null, req.tenantId);
            const userId = result.lastInsertRowid;

            if (roles && Array.isArray(roles)) {
                const insertUR = db.prepare('INSERT INTO user_roles (tenant_id, user_id, role_id) VALUES (?, ?, ?)');
                for (const roleId of roles) {
                    insertUR.run(req.tenantId, userId, roleId);
                }
            }
            return userId;
        })();

        res.status(201).json({ id: userResult, username });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists.' });
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/user-management/:id
router.put('/:id', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, branchId, roles, password } = req.body;

        const user = db.prepare('SELECT id FROM users WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        db.transaction(() => {
            if (password) {
                const hash = bcrypt.hashSync(password, 10);
                db.prepare('UPDATE users SET password_hash = ? WHERE id = ? AND tenant_id = ?').run(hash, id, req.tenantId);
            }

            db.prepare('UPDATE users SET full_name = ?, branch_id = ? WHERE id = ? AND tenant_id = ?')
                .run(fullName || '', branchId || null, id, req.tenantId);

            if (roles && Array.isArray(roles)) {
                db.prepare('DELETE FROM user_roles WHERE user_id = ? AND tenant_id = ?').run(id, req.tenantId);
                const insertUR = db.prepare('INSERT INTO user_roles (tenant_id, user_id, role_id) VALUES (?, ?, ?)');
                for (const roleId of roles) {
                    insertUR.run(req.tenantId, id, roleId);
                }
            }
        })();

        res.json({ id, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/user-management/:id
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const user = db.prepare('SELECT id FROM users WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        db.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?').run(id, req.tenantId);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/user-management/bulk-role-assign
router.post('/bulk-role-assign', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { userIds, roleIds, action } = req.body; // action: 'set' or 'add'
        if (!userIds || !roleIds || !Array.isArray(userIds) || !Array.isArray(roleIds)) {
            return res.status(400).json({ error: 'User IDs and Role IDs are required.' });
        }

        db.transaction(() => {
            for (const userId of userIds) {
                // Verify user belongs to tenant
                const user = db.prepare('SELECT id FROM users WHERE id = ? AND tenant_id = ?').get(userId, req.tenantId);
                if (!user) continue;

                if (action === 'set') {
                    db.prepare('DELETE FROM user_roles WHERE user_id = ? AND tenant_id = ?').run(userId, req.tenantId);
                }
                
                const insertUR = db.prepare('INSERT OR IGNORE INTO user_roles (tenant_id, user_id, role_id) VALUES (?, ?, ?)');
                for (const roleId of roleIds) {
                    insertUR.run(req.tenantId, userId, roleId);
                }
            }
        })();

        res.json({ status: 'Roles assigned successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
