import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import db from '../db/connection.js';

const router = express.Router();

/**
 * @route   GET /api/taxes
 * @desc    Get all active taxes
 * @access  Private
 */
router.get('/', authenticate, (req, res) => {
    try {
        const taxes = db.prepare('SELECT * FROM taxes WHERE is_active = 1').all();
        res.json(taxes.map(t => ({...t, is_active: Boolean(t.is_active)})));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/taxes
 * @desc    Create a new tax slab
 * @access  Private/Admin
 */
router.post('/', authenticate, authorizeAdmin, (req, res) => {
    const { name, rate, is_active = true } = req.body;
    
    if (!name || rate === undefined) {
        return res.status(400).json({ error: 'Name and rate are required' });
    }

    try {
        const result = db.prepare(`
            INSERT INTO taxes (name, rate, is_active)
            VALUES (?, ?, ?)
        `).run(name, rate, is_active ? 1 : 0);
        
        res.status(201).json({ 
            id: result.lastInsertRowid, 
            name, rate, is_active 
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Tax with this name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/taxes/:id
 * @desc    Soft delete a tax slab
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
    try {
        db.prepare('UPDATE taxes SET is_active = 0 WHERE id = ?').run(req.params.id);
        res.json({ message: 'Tax removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
