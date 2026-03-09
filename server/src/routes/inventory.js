import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import db from '../db/connection.js';

const router = express.Router();

/**
 * @route   GET /api/inventory/batches/:productId
 * @desc    Get tracking batches for a product
 * @access  Private
 */
router.get('/batches/:productId', authenticate, (req, res) => {
    try {
        const batches = db.prepare('SELECT * FROM product_batches WHERE product_id = ? ORDER BY created_at DESC').all(req.params.productId);
        
        res.json(batches.map(b => ({
            ...b,
            meta_data: b.meta_data ? JSON.parse(b.meta_data) : null
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/inventory/stock-in
 * @desc    Add new running inventory (create a batch and logic transaction)
 * @access  Private/Admin
 */
router.post('/stock-in', authenticate, authorizeAdmin, (req, res) => {
    const { product_id, batch_number, expiry_date, quantity, cost_price, meta_data } = req.body;

    if (!product_id || !batch_number || !quantity) {
        return res.status(400).json({ error: 'Product ID, Batch Number, and Quantity are required' });
    }

    try {
        db.transaction(() => {
            // 1. Create or Update Batch
            const metaStr = meta_data ? JSON.stringify(meta_data) : null;
            
            const existingBatch = db.prepare('SELECT id, quantity FROM product_batches WHERE product_id = ? AND batch_number = ?').get(product_id, batch_number);
            
            let batchId;
            if (existingBatch) {
                db.prepare('UPDATE product_batches SET quantity = quantity + ?, cost_price = ?, expiry_date = COALESCE(?, expiry_date), meta_data = COALESCE(?, meta_data) WHERE id = ?')
                  .run(quantity, cost_price || 0, expiry_date, metaStr, existingBatch.id);
                batchId = existingBatch.id;
            } else {
                const batchResult = db.prepare(`
                    INSERT INTO product_batches (product_id, batch_number, expiry_date, quantity, cost_price, meta_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(product_id, batch_number, expiry_date || null, quantity, cost_price || 0, metaStr);
                batchId = batchResult.lastInsertRowid;
            }

            // 2. Record Transaction
            db.prepare(`
                INSERT INTO inventory_transactions (product_id, batch_id, type, quantity, reason)
                VALUES (?, ?, 'stock_in', ?, 'New stock received')
            `).run(product_id, batchId, quantity);

            // 3. Update Master Product Quantity
            db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(quantity, product_id);

        })(); // execute transaction
        
        res.status(201).json({ message: 'Stock added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/inventory/damage
 * @desc    Record damaged stock, deducting from a specific batch & main product
 * @access  Private/Admin
 */
router.post('/damage', authenticate, authorizeAdmin, (req, res) => {
    const { product_id, batch_id, quantity, reason } = req.body;

    if (!product_id || !quantity) {
        return res.status(400).json({ error: 'Product ID and Quantity are required' });
    }

    try {
        db.transaction(() => {
            // Record damage transaction
            db.prepare(`
                INSERT INTO inventory_transactions (product_id, batch_id, type, quantity, reason)
                VALUES (?, ?, 'damage', ?, ?)
            `).run(product_id, batch_id || null, -Math.abs(quantity), reason || 'Damaged goods');

            // Reduce Batch Quantity if tracking batches
            if (batch_id) {
                db.prepare('UPDATE product_batches SET quantity = quantity - ? WHERE id = ?').run(Math.abs(quantity), batch_id);
            }

            // Reduce Master Product Quantity
            db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(Math.abs(quantity), product_id);

        })();
        
        res.json({ message: 'Damage recorded successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/inventory/transactions
 * @desc    Get recent inventory transactions logs
 * @access  Private/Admin
 */
router.get('/transactions', authenticate, authorizeAdmin, (req, res) => {
    try {
        const transactions = db.prepare(`
            SELECT t.*, p.name as product_name, b.batch_number
            FROM inventory_transactions t
            JOIN products p ON t.product_id = p.id
            LEFT JOIN product_batches b ON t.batch_id = b.id
            ORDER BY t.created_at DESC
            LIMIT 50
        `).all();
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
