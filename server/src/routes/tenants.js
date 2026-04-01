import { Router } from 'express';
import db from '../db/connection.js';
import bcrypt from 'bcryptjs';
import { authenticate, authorizeSuperAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/tenants - List all tenants (SuperAdmin only)
router.get('/', authenticate, authorizeSuperAdmin, (req, res) => {
    try {
        const tenants = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all();
        res.json(tenants);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/tenants - Create new tenant (SuperAdmin only)
router.post('/', authenticate, authorizeSuperAdmin, (req, res) => {
    try {
        const { name, slug, plan, adminUsername, adminPassword, adminFullName } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required.' });
        }

        const result = db.transaction(() => {
            const tenantInsert = db.prepare('INSERT INTO tenants (name, slug, plan) VALUES (?, ?, ?)')
                .run(name, slug, plan || 'basic');
            
            const tenantId = tenantInsert.lastInsertRowid;
            let userId = null;

            // Optional: Immediately provision an initial admin user for this tenant
            if (adminUsername && adminPassword) {
                const hash = bcrypt.hashSync(adminPassword, 10);
                const userInsert = db.prepare(
                    'INSERT INTO users (username, password_hash, full_name, role, tenant_id) VALUES (?, ?, ?, ?, ?)'
                ).run(adminUsername, hash, adminFullName || 'Tenant Admin', 'admin', tenantId);
                userId = userInsert.lastInsertRowid;
            }

            return { tenantId, userId };
        })();
        
        res.status(201).json({ id: result.tenantId, name, slug, plan: plan || 'basic', adminUserId: result.userId });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Tenant slug or Username already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// GET /api/tenants/:id - Get tenant details
router.get('/:id', authenticate, authorizeSuperAdmin, (req, res) => {
    try {
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });
        res.json(tenant);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/tenants/:id - Update tenant
router.put('/:id', authenticate, authorizeSuperAdmin, (req, res) => {
    try {
        const { name, plan, is_active } = req.body;
        const result = db.prepare('UPDATE tenants SET name = ?, plan = ?, is_active = ? WHERE id = ?')
            .run(name, plan, is_active ? 1 : 0, req.params.id);
        
        if (result.changes === 0) return res.status(404).json({ error: 'Tenant not found.' });
        res.json({ message: 'Tenant updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/tenants/:id - Delete tenant
router.delete('/:id', authenticate, authorizeSuperAdmin, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Tenant not found.' });
        res.json({ message: 'Tenant deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
