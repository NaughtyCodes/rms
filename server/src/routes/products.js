import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import multer from 'multer';
import csvParser from 'csv-parser';
import stream from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/products  — list with search, pagination, category filter
router.get('/', authenticate, (req, res) => {
    try {
        const { search, category_id, page = 1, limit = 50, sort = 'name', order = 'asc' } = req.query;
        const offset = (page - 1) * limit;
        let where = 'WHERE 1=1';
        const params = [];

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

        const total = db.prepare(`SELECT COUNT(*) as count FROM products p ${where}`).get(...params).count;

        const products = db.prepare(`
      SELECT p.*, c.name as category_name, c.tax_rate as category_tax_rate
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}
      ORDER BY p.${sortCol} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

        res.json({ products, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/low-stock
router.get('/low-stock', authenticate, (req, res) => {
    try {
        const products = db.prepare(`
      SELECT p.*, c.name as category_name, c.tax_rate as category_tax_rate
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.quantity <= p.low_stock_threshold
      ORDER BY p.quantity ASC
    `).all();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id
router.get('/:id', authenticate, (req, res) => {
    try {
        const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.tax_rate as category_tax_rate
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found.' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products
router.post('/', authenticate, (req, res) => {
    try {
        const { name, barcode, category_id, cost_price, selling_price, quantity, low_stock_threshold, unit, tax_rate } = req.body;
        if (!name) return res.status(400).json({ error: 'Product name is required.' });

        const result = db.prepare(`
      INSERT INTO products (name, barcode, category_id, cost_price, selling_price, quantity, low_stock_threshold, unit, tax_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, barcode || null, category_id || null, cost_price || 0, selling_price || 0, quantity || 0, low_stock_threshold || 5, unit || 'pcs', tax_rate || 0);

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(product);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'A product with this barcode already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/products/:id
router.put('/:id', authenticate, (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Product not found.' });

        const { name, barcode, category_id, cost_price, selling_price, quantity, low_stock_threshold, unit, tax_rate } = req.body;

        db.prepare(`
      UPDATE products SET name=?, barcode=?, category_id=?, cost_price=?, selling_price=?, quantity=?, low_stock_threshold=?, unit=?, tax_rate=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
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
            req.params.id
        );

        const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Product not found.' });
        res.json({ message: 'Product deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products/import
router.post('/import', authenticate, authorizeAdmin, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const results = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            try {
                const stmt = db.prepare(`
                    INSERT INTO products (name, barcode, category_id, cost_price, selling_price, quantity, low_stock_threshold, unit, tax_rate)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(barcode) DO UPDATE SET
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
                        // category_id parsing could be tricky if it's not present, we will try to pass null
                        stmt.run(
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
