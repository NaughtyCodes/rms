import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Generate invoice number: INV-YYYYMMDD-XXXX
function generateInvoiceNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = db.prepare(
        "SELECT COUNT(*) as c FROM invoices WHERE date(created_at) = date('now')"
    ).get().c;
    return `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}

// POST /api/invoices — create invoice with items (atomic)
router.post('/', authenticate, (req, res) => {
    try {
        const { items, discount = 0, tax_percent = 0, payment_mode = 'cash', customer_name = '', customer_phone = '' } = req.body;

        if (!items || !items.length) {
            return res.status(400).json({ error: 'Invoice must have at least one item.' });
        }

        const createInvoice = db.transaction(() => {
            // Get tax mode from settings
            const taxModeRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('tax_mode');
            const taxMode = taxModeRow ? taxModeRow.value : 'global';

            // Validate stock and calculate subtotal
            let subtotal = 0;
            let calculatedTaxAmount = 0;
            const resolvedItems = [];

            for (const item of items) {
                const product = db.prepare(`
                    SELECT p.*, c.tax_rate as category_tax_rate 
                    FROM products p 
                    LEFT JOIN categories c ON p.category_id = c.id 
                    WHERE p.id = ?
                `).get(item.product_id);

                if (!product) throw new Error(`Product ID ${item.product_id} not found.`);
                if (product.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}`);
                }

                const itemDiscount = item.discount || 0;
                const lineTotal = (product.selling_price * item.quantity) - itemDiscount;
                subtotal += lineTotal;

                // Item level tax calculation
                if (taxMode === 'product' || taxMode === 'category') {
                    const rate = (taxMode === 'product') ? (product.tax_rate || 0) : (product.category_tax_rate || 0);
                    // Distribute bill-level discount proportionally to item tax (simplified for consistency with frontend)
                    const discountRatio = subtotal > 0 ? (discount / subtotal) : 0;
                    const itemTaxable = lineTotal * (1 - (discount / (subtotal + (items.length * 10)))); // Rough estimate or just use lineTotal
                    // Better: use the same logic as frontend: (itemTaxable * rate) / 100
                    // Since the backend doesn't know the FINAL subtotal yet during the loop, we calculate tax after the loop for precision.
                }

                resolvedItems.push({
                    product_id: product.id,
                    product_name: product.name,
                    quantity: item.quantity,
                    unit_price: product.selling_price,
                    discount: itemDiscount,
                    line_total: lineTotal,
                    tax_rate: (taxMode === 'product') ? (product.tax_rate || 0) : (product.category_tax_rate || 0)
                });
            }

            const invoiceDiscount = discount;
            const taxableAmount = subtotal - invoiceDiscount;
            
            if (taxMode === 'product' || taxMode === 'category') {
                const discountRatio = subtotal > 0 ? (invoiceDiscount / subtotal) : 0;
                for (const ri of resolvedItems) {
                    const itemTaxable = ri.line_total * (1 - discountRatio);
                    calculatedTaxAmount += (itemTaxable * ri.tax_rate) / 100;
                }
            } else {
                calculatedTaxAmount = taxableAmount * tax_percent / 100;
            }

            const taxAmountFinal = Math.round(calculatedTaxAmount * 100) / 100;
            const total = Math.round((taxableAmount + taxAmountFinal) * 100) / 100;
            const invoiceNumber = generateInvoiceNumber();

            // Insert invoice
            const invResult = db.prepare(`
        INSERT INTO invoices (invoice_number, user_id, subtotal, discount, tax_percent, tax_amount, total, payment_mode, customer_name, customer_phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(invoiceNumber, req.user.id, subtotal, invoiceDiscount, tax_percent, taxAmountFinal, total, payment_mode, customer_name, customer_phone);

            const invoiceId = invResult.lastInsertRowid;

            // Insert items & decrement stock
            const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, discount, line_total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            const decrementStock = db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?');

            for (const ri of resolvedItems) {
                insertItem.run(invoiceId, ri.product_id, ri.product_name, ri.quantity, ri.unit_price, ri.discount, ri.line_total);
                decrementStock.run(ri.quantity, ri.product_id);
            }

            return { id: invoiceId, invoice_number: invoiceNumber, subtotal, discount: invoiceDiscount, tax_percent, tax_amount: taxAmountFinal, total, payment_mode, items: resolvedItems };
        });

        const invoice = createInvoice();
        res.status(201).json(invoice);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/invoices — list invoices with date filter
router.get('/', authenticate, (req, res) => {
    try {
        const { date, from, to, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let where = 'WHERE 1=1';
        const params = [];

        if (date) {
            where += " AND date(i.created_at) = ?";
            params.push(date);
        } else {
            if (from) { where += " AND date(i.created_at) >= ?"; params.push(from); }
            if (to) { where += " AND date(i.created_at) <= ?"; params.push(to); }
        }

        const total = db.prepare(`SELECT COUNT(*) as count FROM invoices i ${where}`).get(...params).count;

        const invoices = db.prepare(`
      SELECT i.*, u.username as cashier
      FROM invoices i
      LEFT JOIN users u ON i.user_id = u.id
      ${where}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

        res.json({ invoices, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/:id — single invoice with all items
router.get('/:id', authenticate, (req, res) => {
    try {
        const invoice = db.prepare(`
      SELECT i.*, u.username as cashier
      FROM invoices i LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `).get(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

        const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
        res.json({ ...invoice, items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
