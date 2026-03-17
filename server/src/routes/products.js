import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import multer from 'multer';
import csvParser from 'csv-parser';
import stream from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/products  — list with search, pagination, category filter
// GET /api/products  — list with search, pagination, category filter
router.get('/', authenticate, (req, res) => {
    try {
        const { search, category_id, page = 1, limit = 50, sort = 'name', order = 'asc' } = req.query;
        const offset = (page - 1) * limit;
        let where = 'WHERE p.tenant_id = ?';
        const params = [req.tenantId];

        if (search) {
            where += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category_id) {
            where += ' AND p.category_id = ?';
            params.push(category_id);
        }

        const allowedSort = ['name', 'selling_price', 'quantity', 'created_at'];
        const sortCol = allowedSort.includes(sort) ? sort : 'name';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        const totalRow = db.prepare(`SELECT COUNT(*) as count FROM products p ${where}`).get(...params);
        const total = totalRow ? totalRow.count : 0;

        const products = db.prepare(`
            SELECT p.*, c.name as category_name, c.tax_rate as category_tax_rate,
                   (SELECT quantity FROM branch_stock WHERE branch_id = ? AND product_id = p.id AND tenant_id = ?) as branch_quantity,
                   (SELECT json_group_array(json_object('branch_name', b.name, 'quantity', bs.quantity))
                    FROM branch_stock bs JOIN branches b ON bs.branch_id = b.id WHERE bs.product_id = p.id AND bs.tenant_id = ?) as branch_stocks_json
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ${where}
            ORDER BY p.${sortCol} ${sortOrder}
            LIMIT ? OFFSET ?
        `).all(req.user.branchId || null, req.tenantId, req.tenantId, ...params, Number(limit), Number(offset));

        products.forEach(p => {
            if (p.branch_stocks_json) {
                try { p.branch_stocks = JSON.parse(p.branch_stocks_json); } catch(e) { p.branch_stocks = []; }
            } else {
                p.branch_stocks = [];
            }
            delete p.branch_stocks_json;
        });

        res.json({ products, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/low-stock
router.get('/low-stock', authenticate, (req, res) => {
    try {
        const products = db.prepare(`
            SELECT p.*, c.name as category_name, c.tax_rate as category_tax_rate,
                   (SELECT quantity FROM branch_stock WHERE branch_id = ? AND product_id = p.id AND tenant_id = ?) as branch_quantity
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.tenant_id = ? AND (SELECT quantity FROM branch_stock WHERE branch_id = ? AND product_id = p.id AND tenant_id = ?) <= p.low_stock_threshold
            ORDER BY branch_quantity ASC
        `).all(req.user.branchId || null, req.tenantId, req.tenantId, req.user.branchId || null, req.tenantId);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id
router.get('/:id', authenticate, (req, res) => {
    try {
        const product = db.prepare(`
            SELECT p.*, c.name as category_name, c.tax_rate as category_tax_rate,
                   (SELECT quantity FROM branch_stock WHERE branch_id = ? AND product_id = p.id AND tenant_id = ?) as branch_quantity
            FROM products p LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.tenant_id = ?
        `).get(req.user.branchId || null, req.tenantId, req.params.id, req.tenantId);
        
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        // Fetch meta values
        product.meta_values = db.prepare(`
            SELECT m.id, m.field_id, m.value, f.name, f.type 
            FROM product_meta_values m
            JOIN product_meta_fields f ON m.field_id = f.id
            WHERE m.product_id = ? AND m.tenant_id = ?
        `).all(req.params.id, req.tenantId);

        // Fetch branch stock for all branches if admin
        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
            product.branch_stocks = db.prepare(`
                SELECT bs.quantity, b.name as branch_name 
                FROM branch_stock bs 
                JOIN branches b ON bs.branch_id = b.id 
                WHERE bs.product_id = ? AND bs.tenant_id = ?
            `).all(req.params.id, req.tenantId);
        }

        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products
router.post('/', authenticate, (req, res) => {
    try {
        const { name, barcode, category_id, cost_price, selling_price, quantity, low_stock_threshold, unit, tax_rate, meta_values } = req.body;
        if (!name) return res.status(400).json({ error: 'Product name is required.' });

        db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO products (tenant_id, name, barcode, category_id, cost_price, selling_price, quantity, low_stock_threshold, unit, tax_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(req.tenantId, name, barcode || null, category_id || null, cost_price || 0, selling_price || 0, quantity || 0, low_stock_threshold || 5, unit || 'pcs', tax_rate || 0);

            const productId = result.lastInsertRowid;

            if (meta_values && Array.isArray(meta_values)) {
                const insertMeta = db.prepare(`
                    INSERT INTO product_meta_values (tenant_id, product_id, field_id, value)
                    VALUES (?, ?, ?, ?)
                `);
                
                for (const meta of meta_values) {
                    if (meta.field_id && meta.value !== undefined && meta.value !== '') {
                        insertMeta.run(req.tenantId, productId, meta.field_id, String(meta.value));
                    }
                }
            }
            req.newProductId = productId;
        })();

        const product = db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?').get(req.newProductId, req.tenantId);
        res.status(201).json(product);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'A product with this barcode already exists in your shop.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/products/:id
router.put('/:id', authenticate, (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
        if (!existing) return res.status(404).json({ error: 'Product not found.' });

        const { name, barcode, category_id, cost_price, selling_price, quantity, low_stock_threshold, unit, tax_rate, meta_values } = req.body;

        db.transaction(() => {
            db.prepare(`
                UPDATE products SET name=?, barcode=?, category_id=?, cost_price=?, selling_price=?, quantity=?, low_stock_threshold=?, unit=?, tax_rate=?, updated_at=CURRENT_TIMESTAMP
                WHERE id=? AND tenant_id=?
            `).run(
                name ?? existing.name,
                barcode !== undefined ? barcode : existing.barcode,
                category_id !== undefined ? category_id : existing.category_id,
                cost_price ?? existing.cost_price,
                selling_price ?? existing.selling_price,
                quantity ?? existing.quantity,
                low_stock_threshold ?? existing.low_stock_threshold,
                unit ?? existing.unit,
                tax_rate ?? existing.tax_rate,
                req.params.id,
                req.tenantId
            );

            if (meta_values && Array.isArray(meta_values)) {
                db.prepare('DELETE FROM product_meta_values WHERE product_id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
                const insertMeta = db.prepare(`
                    INSERT INTO product_meta_values (tenant_id, product_id, field_id, value)
                    VALUES (?, ?, ?, ?)
                `);
                for (const meta of meta_values) {
                    if (meta.field_id && meta.value !== undefined && meta.value !== '') {
                        insertMeta.run(req.tenantId, req.params.id, meta.field_id, String(meta.value));
                    }
                }
            }
        })();

        const updated = db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM products WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
        if (result.changes === 0) return res.status(404).json({ error: 'Product not found.' });
        res.json({ message: 'Product deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products/import
router.post('/import', authenticate, authorizeAdmin, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const results = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            try {
                const stmt = db.prepare(`
                    INSERT INTO products (tenant_id, name, barcode, category_id, cost_price, selling_price, quantity, low_stock_threshold, unit, tax_rate)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(tenant_id, barcode) DO UPDATE SET
                        name=excluded.name,
                        category_id=excluded.category_id,
                        cost_price=excluded.cost_price,
                        selling_price=excluded.selling_price,
                        quantity=excluded.quantity,
                        low_stock_threshold=excluded.low_stock_threshold,
                        unit=excluded.unit,
                        tax_rate=excluded.tax_rate,
                        updated_at=CURRENT_TIMESTAMP
                `);

                const importTx = db.transaction((items) => {
                    let totalImported = 0;
                    for (const item of items) {
                        if (!item.name) continue;
                        stmt.run(
                            req.tenantId,
                            item.name,
                            item.barcode || null,
                            item.category_id || null,
                            item.cost_price || 0,
                            item.selling_price || 0,
                            item.quantity || 0,
                            item.low_stock_threshold || 5,
                            item.unit || 'pcs',
                            item.tax_rate || 0
                        );
                        totalImported++;
                    }
                    return totalImported;
                });

                const count = importTx(results);
                res.json({ message: `Successfully imported ${count} products.` });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
});

export default router;
