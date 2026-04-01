import express from 'express';
import { authenticate, authorizeAdmin, authorizePermission } from '../middleware/auth.js';
import db from '../db/connection.js';

const router = express.Router();

function recalculateProductPricing(product_id, tenant_id) {
    const prod = db.prepare('SELECT pricing_strategy, target_margin FROM products WHERE id = ? AND tenant_id = ?').get(product_id, tenant_id);
    if (!prod || prod.pricing_strategy === 'manual') return;

    const batches = db.prepare('SELECT quantity, cost_price, created_at FROM product_batches WHERE product_id = ? AND tenant_id = ? AND quantity > 0 ORDER BY created_at DESC').all(product_id, tenant_id);
    if (batches.length === 0) return;

    let newCost = 0;
    if (prod.pricing_strategy === 'weighted_average') {
        let totalCost = 0;
        let totalQty = 0;
        for (const b of batches) {
            totalCost += (b.cost_price * b.quantity);
            totalQty += b.quantity;
        }
        if (totalQty > 0) newCost = totalCost / totalQty;
    } else if (prod.pricing_strategy === 'highest_cost') {
        newCost = Math.max(...batches.map(b => b.cost_price));
    } else if (prod.pricing_strategy === 'latest_cost') {
        // Since it's ordered by created_at DESC, the first one is the latest
        newCost = batches[0].cost_price;
    }

    const newSelling = newCost * (1 + (prod.target_margin / 100));

    db.prepare('UPDATE products SET cost_price = ?, selling_price = ? WHERE id = ? AND tenant_id = ?').run(newCost, newSelling, product_id, tenant_id);
}

/**
 * @route   GET /api/inventory/batches/:productId
 * @desc    Get tracking batches for a product
 * @access  Private
 */
// GET /api/inventory/batches/:productId
router.get('/batches/:productId', authenticate, authorizePermission('view_inventory'), (req, res) => {
    try {
        const batches = db.prepare(`
            SELECT * FROM product_batches 
            WHERE product_id = ? AND tenant_id = ? 
            ORDER BY created_at DESC
        `).all(req.params.productId, req.tenantId);
        
        res.json(batches.map(b => ({
            ...b,
            meta_data: b.meta_data ? JSON.parse(b.meta_data) : null
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/inventory/stock-in
router.post('/stock-in', authenticate, authorizePermission('manage_inventory'), (req, res) => {
    const { product_id, batch_number, expiry_date, quantity, cost_price, meta_data } = req.body;

    if (!product_id || !batch_number || !quantity) {
        return res.status(400).json({ error: 'Product ID, Batch Number, and Quantity are required' });
    }

    try {
        db.transaction(() => {
            // Verify product belongs to tenant
            const prod = db.prepare('SELECT id FROM products WHERE id = ? AND tenant_id = ?').get(product_id, req.tenantId);
            if (!prod) throw new Error('Product not found in your tenant scope');

            // 1. Create or Update Batch
            const metaStr = meta_data ? JSON.stringify(meta_data) : null;
            const existingBatch = db.prepare('SELECT id, quantity FROM product_batches WHERE product_id = ? AND batch_number = ? AND tenant_id = ?')
                .get(product_id, batch_number, req.tenantId);
            
            let batchId;
            if (existingBatch) {
                db.prepare('UPDATE product_batches SET quantity = quantity + ?, cost_price = ?, expiry_date = COALESCE(?, expiry_date), meta_data = COALESCE(?, meta_data) WHERE id = ? AND tenant_id = ?')
                  .run(quantity, cost_price || 0, expiry_date, metaStr, existingBatch.id, req.tenantId);
                batchId = existingBatch.id;
            } else {
                const batchResult = db.prepare(`
                    INSERT INTO product_batches (tenant_id, product_id, batch_number, expiry_date, quantity, cost_price, meta_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(req.tenantId, product_id, batch_number, expiry_date || null, quantity, cost_price || 0, metaStr);
                batchId = batchResult.lastInsertRowid;
            }

            // 2. Record Transaction
            db.prepare(`
                INSERT INTO inventory_transactions (tenant_id, product_id, batch_id, type, quantity, reason)
                VALUES (?, ?, ?, 'stock_in', ?, 'New stock received')
            `).run(req.tenantId, product_id, batchId, quantity);

            // 3. Update Branch Stock
            const targetBranch = req.body.branch_id || req.user.branchId;
            if (targetBranch) {
                const existingStock = db.prepare('SELECT * FROM branch_stock WHERE branch_id = ? AND product_id = ? AND tenant_id = ?')
                    .get(targetBranch, product_id, req.tenantId);
                if (existingStock) {
                    db.prepare('UPDATE branch_stock SET quantity = quantity + ? WHERE branch_id = ? AND product_id = ? AND tenant_id = ?')
                        .run(quantity, targetBranch, product_id, req.tenantId);
                } else {
                    db.prepare('INSERT INTO branch_stock (tenant_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(req.tenantId, targetBranch, product_id, quantity);
                }
            } else {
                db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ? AND tenant_id = ?').run(quantity, product_id, req.tenantId);
            }

            // 4. Recalculate Pricing based on Strategy
            recalculateProductPricing(product_id, req.tenantId);

        })();
        
        res.status(201).json({ message: 'Stock added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/inventory/damage
router.post('/damage', authenticate, authorizePermission('manage_inventory'), (req, res) => {
    const { product_id, batch_id, quantity, reason } = req.body;

    if (!product_id || !quantity) {
        return res.status(400).json({ error: 'Product ID and Quantity are required' });
    }

    try {
        db.transaction(() => {
            // Verify product belongs to tenant
            const prod = db.prepare('SELECT id FROM products WHERE id = ? AND tenant_id = ?').get(product_id, req.tenantId);
            if (!prod) throw new Error('Product not found in your tenant scope');

            // Record damage transaction
            db.prepare(`
                INSERT INTO inventory_transactions (tenant_id, product_id, batch_id, type, quantity, reason)
                VALUES (?, ?, ?, 'damage', ?, ?)
            `).run(req.tenantId, product_id, batch_id || null, -Math.abs(quantity), reason || 'Damaged goods');

            // Reduce Batch Quantity if tracking batches
            if (batch_id) {
                db.prepare('UPDATE product_batches SET quantity = quantity - ? WHERE id = ? AND tenant_id = ?').run(Math.abs(quantity), batch_id, req.tenantId);
            }

            // Reduce Branch Stock
            const targetBranch = req.body.branch_id || req.user.branchId;
            if (targetBranch) {
                db.prepare('UPDATE branch_stock SET quantity = quantity - ? WHERE branch_id = ? AND product_id = ? AND tenant_id = ?')
                    .run(Math.abs(quantity), targetBranch, product_id, req.tenantId);
            } else {
                db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ? AND tenant_id = ?').run(Math.abs(quantity), product_id, req.tenantId);
            }

        })();
        
        res.json({ message: 'Damage recorded successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/inventory/transactions
router.get('/transactions', authenticate, authorizePermission('view_inventory'), (req, res) => {
    try {
        const transactions = db.prepare(`
            SELECT t.*, p.name as product_name, b.batch_number
            FROM inventory_transactions t
            JOIN products p ON t.product_id = p.id
            LEFT JOIN product_batches b ON t.batch_id = b.id
            WHERE t.tenant_id = ?
            ORDER BY t.created_at DESC
            LIMIT 50
        `).all(req.tenantId);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
