import { Router } from 'express';
import db from '../db/connection.js';
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
        const { name, slug, plan } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required.' });
        }

        const result = db.prepare('INSERT INTO tenants (name, slug, plan) VALUES (?, ?, ?)')
            .run(name, slug, plan || 'basic');
        
        res.status(201).json({ id: result.lastInsertRowid, name, slug, plan: plan || 'basic' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Tenant slug already exists.' });
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

export default router;
