import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import db from '../db/connection.js';

const router = express.Router();

/**
 * @route   GET /api/meta-fields
 * @desc    Get all active product meta fields
 * @access  Private
 */
router.get('/', authenticate, (req, res) => {
    try {
        const fields = db.prepare('SELECT * FROM product_meta_fields').all();
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

/**
 * @route   POST /api/meta-fields
 * @desc    Create a new product meta field
 * @access  Private/Admin
 */
router.post('/', authenticate, authorizeAdmin, (req, res) => {
    const { name, type, options, is_required } = req.body;
    
    if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
    }

    try {
        const optionsStr = options && Array.isArray(options) ? JSON.stringify(options) : null;
        
        const stmt = db.prepare(`
            INSERT INTO product_meta_fields (name, type, options, is_required)
            VALUES (?, ?, ?, ?)
        `);
        
        const result = stmt.run(name, type, optionsStr, is_required ? 1 : 0);
        
        res.status(201).json({ 
            id: result.lastInsertRowid, 
            name, type, options, is_required 
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Meta field with this name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/meta-fields/:id
 * @desc    Delete a meta field
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM product_meta_fields WHERE id = ?').run(req.params.id);
        res.json({ message: 'Meta field deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
