import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';

const router = Router();

// GET all branches for current tenant
router.get('/', authenticate, (req, res) => {
    try {
        const branches = db.prepare('SELECT * FROM branches WHERE tenant_id = ? ORDER BY name ASC').all(req.tenantId);
        res.json(branches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new branch (Admin only)
router.post('/', authenticate, authorizePermission('manage_branches'), (req, res) => {
    try {
        const { name, address, phone, isWarehouse, isActive } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Branch name is required.' });
        }

        const stmt = db.prepare(`
            INSERT INTO branches (tenant_id, name, address, phone, is_warehouse, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(req.tenantId, name, address || '', phone || '', isWarehouse ? 1 : 0, isActive !== false ? 1 : 0);
        res.status(201).json({ id: info.lastInsertRowid, name });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Branch name already exists in your shop.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT update branch (Admin only)
router.put('/:id', authenticate, authorizePermission('manage_branches'), (req, res) => {
    try {
        const { name, address, phone, isWarehouse, isActive } = req.body;
        const stmt = db.prepare(`
            UPDATE branches 
            SET name = ?, address = ?, phone = ?, is_warehouse = ?, is_active = ?
            WHERE id = ? AND tenant_id = ?
        `);
        const info = stmt.run(name, address || '', phone || '', isWarehouse ? 1 : 0, isActive !== false ? 1 : 0, req.params.id, req.tenantId);
        
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Branch not found in your shop scope' });
        }
        res.json({ message: 'Branch updated successfully' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Branch name already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

export default router;
