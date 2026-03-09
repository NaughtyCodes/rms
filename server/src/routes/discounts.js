import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import db from '../db/connection.js';

const router = express.Router();

/**
 * @route   GET /api/discounts/:productId
 * @desc    Get active discount for a specific product
 * @access  Private
 */
router.get('/:productId', authenticate, (req, res) => {
    try {
        // Find active discount
        const discount = db.prepare(`
            SELECT * FROM product_discounts 
            WHERE product_id = ? 
            AND is_active = 1
            AND (start_date IS NULL OR start_date <= datetime('now'))
            AND (end_date IS NULL OR end_date >= datetime('now'))
            ORDER BY id DESC LIMIT 1
        `).get(req.params.productId);
        
        res.json(discount || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/discounts
 * @desc    Create or update a product discount
 * @access  Private/Admin
 */
router.post('/', authenticate, authorizeAdmin, (req, res) => {
    const { product_id, discount_type, discount_value, start_date, end_date } = req.body;
    
    if (!product_id || !discount_value) {
        return res.status(400).json({ error: 'Product ID and Discount Value are required' });
    }

    try {
        db.transaction(() => {
            // Deactivate existing active discounts for this product
            db.prepare('UPDATE product_discounts SET is_active = 0 WHERE product_id = ?').run(product_id);

            // Insert new active discount
            db.prepare(`
                INSERT INTO product_discounts (product_id, discount_type, discount_value, start_date, end_date, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
            `).run(product_id, discount_type || 'percentage', discount_value, start_date || null, end_date || null);
        })();
        
        res.status(201).json({ message: 'Discount applied successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/discounts/:productId
 * @desc    Remove (deactivate) discount for a product
 * @access  Private/Admin
 */
router.delete('/:productId', authenticate, authorizeAdmin, (req, res) => {
    try {
        db.prepare('UPDATE product_discounts SET is_active = 0 WHERE product_id = ?').run(req.params.productId);
        res.json({ message: 'Discount removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
