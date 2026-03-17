import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import db from '../db/connection.js';

const router = express.Router();

/**
 * @route   GET /api/taxes
 * @desc    Get all active taxes
 * @access  Private
 */
// GET /api/taxes — Get all active taxes for tenant
router.get('/', authenticate, (req, res) => {
    try {
        const taxes = db.prepare('SELECT * FROM taxes WHERE tenant_id = ? AND is_active = 1').all(req.tenantId);
        res.json(taxes.map(t => ({...t, is_active: Boolean(t.is_active)})));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/taxes — Create a new tax slab
router.post('/', authenticate, authorizeAdmin, (req, res) => {
    const { name, rate, is_active = true } = req.body;
    
    if (!name || rate === undefined) {
        return res.status(400).json({ error: 'Name and rate are required' });
    }

    try {
        const result = db.prepare(`
            INSERT INTO taxes (tenant_id, name, rate, is_active)
            VALUES (?, ?, ?, ?)
        `).run(req.tenantId, name, rate, is_active ? 1 : 0);
        
        res.status(201).json({ 
            id: result.lastInsertRowid, 
            name, rate, is_active 
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Tax with this name already exists in your shop' });
        }
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/taxes/:id — Soft delete a tax slab
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
    try {
        db.prepare('UPDATE taxes SET is_active = 0 WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
        res.json({ message: 'Tax removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
