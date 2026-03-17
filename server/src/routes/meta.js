import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import db from '../db/connection.js';

const router = express.Router();

/**
 * @route   GET /api/meta-fields
 * @desc    Get all active product meta fields
 * @access  Private
 */
// GET /api/meta-fields — Get all active product meta fields
router.get('/', authenticate, (req, res) => {
    try {
        const fields = db.prepare('SELECT * FROM product_meta_fields WHERE tenant_id = ?').all(req.tenantId);
        // Parse options array if it exists
        const formatted = fields.map(f => ({
            ...f,
            options: f.options ? JSON.parse(f.options) : null,
            is_required: Boolean(f.is_required)
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/meta-fields — Create a new product meta field
router.post('/', authenticate, authorizeAdmin, (req, res) => {
    const { name, type, options, is_required } = req.body;
    
    if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
    }

    try {
        const optionsStr = options && Array.isArray(options) ? JSON.stringify(options) : null;
        
        const stmt = db.prepare(`
            INSERT INTO product_meta_fields (tenant_id, name, type, options, is_required)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(req.tenantId, name, type, optionsStr, is_required ? 1 : 0);
        
        res.status(201).json({ 
            id: result.lastInsertRowid, 
            name, type, options, is_required 
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Meta field with this name already exists in your shop' });
        }
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/meta-fields/:id — Delete a meta field
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM product_meta_fields WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
        if (result.changes === 0) return res.status(404).json({ error: 'Meta field not found in your shop scope' });
        res.json({ message: 'Meta field deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
