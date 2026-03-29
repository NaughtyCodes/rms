import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';

const router = Router();

// GET all transfers (Admin sees all, branch user sees own)
// GET all transfers (Admin sees all within tenant, branch user sees own within tenant)
router.get('/', authenticate, (req, res) => {
    try {
        let whereClause = 't.tenant_id = ?';
        let params = [req.tenantId];
        
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.branchId) {
            whereClause += ' AND (t.from_branch_id = ? OR t.to_branch_id = ?)';
            params.push(req.user.branchId, req.user.branchId);
        }

        const transfers = db.prepare(`
            SELECT t.*, 
                   fb.name as from_branch_name, 
                   tb.name as to_branch_name
            FROM stock_transfers t
            LEFT JOIN branches fb ON t.from_branch_id = fb.id
            LEFT JOIN branches tb ON t.to_branch_id = tb.id
            WHERE ${whereClause}
            ORDER BY t.created_at DESC
        `).all(...params);

        // Fetch items for each transfer
        const stmtItems = db.prepare(`
            SELECT i.*, p.name as product_name
            FROM stock_transfer_items i
            JOIN products p ON i.product_id = p.id
            WHERE i.transfer_id = ? AND i.tenant_id = ?
        `);

        for (let t of transfers) {
            t.items = stmtItems.all(t.id, req.tenantId);
        }

        res.json(transfers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new transfer request
router.post('/', authenticate, authorizePermission('transfer_stock'), (req, res) => {
    try {
        const { from_branch_id, to_branch_id, notes, items } = req.body;
        
        if (!from_branch_id || !to_branch_id || !items || !items.length) {
            return res.status(400).json({ error: 'Missing required transfer details.' });
        }

        let newTransferId;
        db.transaction(() => {
            // Verify branches belong to tenant
            const branchCheck = db.prepare('SELECT COUNT(*) as count FROM branches WHERE id IN (?, ?) AND tenant_id = ?').get(from_branch_id, to_branch_id, req.tenantId);
            if (branchCheck.count < 2) throw new Error('One or both branches not found in your tenant.');

            const result = db.prepare(`
                INSERT INTO stock_transfers (tenant_id, from_branch_id, to_branch_id, notes, status)
                VALUES (?, ?, ?, ?, 'pending')
            `).run(req.tenantId, from_branch_id, to_branch_id, notes || '');

            newTransferId = result.lastInsertRowid;

            const insertItem = db.prepare(`
                INSERT INTO stock_transfer_items (tenant_id, transfer_id, product_id, quantity)
                VALUES (?, ?, ?, ?)
            `);

            for (const item of items) {
                if (item.product_id && item.quantity > 0) {
                    insertItem.run(req.tenantId, newTransferId, item.product_id, item.quantity);
                }
            }
        })();

        res.status(201).json({ id: newTransferId, message: 'Transfer request created.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update status (ship, receive, cancel)
router.put('/:id/status', authenticate, authorizePermission('transfer_stock'), (req, res) => {
    try {
        const { status } = req.body; // 'shipped', 'received', 'cancelled'
        if (!['shipped', 'received', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const transfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
        if (!transfer) return res.status(404).json({ error: 'Transfer not found.' });

        if (transfer.status === 'received' || transfer.status === 'cancelled') {
            return res.status(400).json({ error: 'Cannot update a completed or cancelled transfer.' });
        }

        db.transaction(() => {
            db.prepare('UPDATE stock_transfers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?').run(status, req.params.id, req.tenantId);

            // If received, update branch_stock
            if (status === 'received') {
                const items = db.prepare('SELECT * FROM stock_transfer_items WHERE transfer_id = ? AND tenant_id = ?').all(req.params.id, req.tenantId);
                
                const getStock = db.prepare('SELECT quantity FROM branch_stock WHERE branch_id = ? AND product_id = ? AND tenant_id = ?');
                const insertStock = db.prepare('INSERT INTO branch_stock (tenant_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)');
                const updateStock = db.prepare('UPDATE branch_stock SET quantity = ? WHERE branch_id = ? AND product_id = ? AND tenant_id = ?');

                for (const item of items) {
                    // Reduce from source branch
                    const fromStock = getStock.get(transfer.from_branch_id, item.product_id, req.tenantId);
                    if (fromStock) {
                        updateStock.run(fromStock.quantity - item.quantity, transfer.from_branch_id, item.product_id, req.tenantId);
                    } else {
                        insertStock.run(req.tenantId, transfer.from_branch_id, item.product_id, -item.quantity);
                    }

                    // Add to destination branch
                    const toStock = getStock.get(transfer.to_branch_id, item.product_id, req.tenantId);
                    if (toStock) {
                        updateStock.run(toStock.quantity + item.quantity, transfer.to_branch_id, item.product_id, req.tenantId);
                    } else {
                        insertStock.run(req.tenantId, transfer.to_branch_id, item.product_id, item.quantity);
                    }
                }
            }
        })();

        res.json({ message: `Transfer ${status}.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
