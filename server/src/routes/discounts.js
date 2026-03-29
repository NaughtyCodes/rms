import express from 'express';
import { authenticate, authorizePermission } from '../middleware/auth.js';
import db from '../db/connection.js';

const router = express.Router();

/**
 * @route   GET /api/discounts/:productId
 * @desc    Get active discount for a specific product
 * @access  Private
 */
// GET /api/discounts/:productId — Get active discount for a specific product
router.get('/:productId', authenticate, (req, res) => {
    try {
        const discount = db.prepare(`
            SELECT * FROM product_discounts 
            WHERE product_id = ? AND tenant_id = ?
            AND is_active = 1
            AND (start_date IS NULL OR start_date <= datetime('now'))
            AND (end_date IS NULL OR end_date >= datetime('now'))
            ORDER BY id DESC LIMIT 1
        `).get(req.params.productId, req.tenantId);
        
        res.json(discount || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/discounts — Create or update a product discount
router.post('/', authenticate, authorizePermission('manage_discounts'), (req, res) => {
    const { product_id, discount_type, discount_value, start_date, end_date } = req.body;
    
    if (!product_id || !discount_value) {
        return res.status(400).json({ error: 'Product ID and Discount Value are required' });
    }

    try {
        db.transaction(() => {
            // Verify product belongs to tenant
            const prod = db.prepare('SELECT id FROM products WHERE id = ? AND tenant_id = ?').get(product_id, req.tenantId);
            if (!prod) throw new Error('Product not found in your shop scope');

            // Deactivate existing active discounts for this product
            db.prepare('UPDATE product_discounts SET is_active = 0 WHERE product_id = ? AND tenant_id = ?').run(product_id, req.tenantId);

            // Insert new active discount
            db.prepare(`
                INSERT INTO product_discounts (tenant_id, product_id, discount_type, discount_value, start_date, end_date, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            `).run(req.tenantId, product_id, discount_type || 'percentage', discount_value, start_date || null, end_date || null);
        })();
        
        res.status(201).json({ message: 'Discount applied successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/discounts/:productId — Remove (deactivate) discount for a product
router.delete('/:productId', authenticate, authorizePermission('manage_discounts'), (req, res) => {
    try {
        db.prepare('UPDATE product_discounts SET is_active = 0 WHERE product_id = ? AND tenant_id = ?').run(req.params.productId, req.tenantId);
        res.json({ message: 'Discount removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
