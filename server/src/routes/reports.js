import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/reports/dashboard — today's KPIs
router.get('/dashboard', authenticate, (req, res) => {
    try {
        const today = db.prepare(`
      SELECT
        COUNT(*) as total_bills,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(discount), 0) as total_discount,
        COALESCE(SUM(tax_amount), 0) as total_tax
      FROM invoices WHERE date(created_at) = date('now')
    `).get();

        const itemsSold = db.prepare(`
      SELECT COALESCE(SUM(ii.quantity), 0) as count
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE date(i.created_at) = date('now')
    `).get().count;

        const lowStockCount = db.prepare(
            'SELECT COUNT(*) as count FROM products WHERE quantity <= low_stock_threshold'
        ).get().count;

        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;

        const paymentSplit = db.prepare(`
      SELECT payment_mode, COUNT(*) as count, COALESCE(SUM(total), 0) as amount
      FROM invoices WHERE date(created_at) = date('now')
      GROUP BY payment_mode
    `).all();

        res.json({
            today: { ...today, items_sold: itemsSold },
            low_stock_count: lowStockCount,
            total_products: totalProducts,
            payment_split: paymentSplit
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', authenticate, (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);

        const summary = db.prepare(`
      SELECT COUNT(*) as total_bills, COALESCE(SUM(total), 0) as revenue,
             COALESCE(SUM(discount), 0) as discount, COALESCE(SUM(tax_amount), 0) as tax
      FROM invoices WHERE date(created_at) = ?
    `).get(date);

        const hourly = db.prepare(`
      SELECT strftime('%H', created_at) as hour, COUNT(*) as bills, COALESCE(SUM(total), 0) as revenue
      FROM invoices WHERE date(created_at) = ?
      GROUP BY hour ORDER BY hour
    `).all(date);

        const topItems = db.prepare(`
      SELECT ii.product_name, SUM(ii.quantity) as qty, SUM(ii.line_total) as revenue
      FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id
      WHERE date(i.created_at) = ?
      GROUP BY ii.product_id ORDER BY qty DESC LIMIT 10
    `).all(date);

        res.json({ date, summary, hourly, top_items: topItems });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/monthly?month=MM&year=YYYY
router.get('/monthly', authenticate, (req, res) => {
    try {
        const now = new Date();
        const month = req.query.month || String(now.getMonth() + 1).padStart(2, '0');
        const year = req.query.year || String(now.getFullYear());

        const daily = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as bills, COALESCE(SUM(total), 0) as revenue
      FROM invoices
      WHERE strftime('%m', created_at) = ? AND strftime('%Y', created_at) = ?
      GROUP BY date ORDER BY date
    `).all(month, year);

        const summary = db.prepare(`
      SELECT COUNT(*) as total_bills, COALESCE(SUM(total), 0) as revenue,
             COALESCE(SUM(discount), 0) as discount, COALESCE(SUM(tax_amount), 0) as tax
      FROM invoices
      WHERE strftime('%m', created_at) = ? AND strftime('%Y', created_at) = ?
    `).get(month, year);

        res.json({ month, year, summary, daily });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/top-products?limit=10&days=30
router.get('/top-products', authenticate, (req, res) => {
    try {
        const limit = req.query.limit || 10;
        const days = req.query.days || 30;

        const products = db.prepare(`
      SELECT ii.product_name, ii.product_id, SUM(ii.quantity) as total_qty, SUM(ii.line_total) as total_revenue
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY ii.product_id ORDER BY total_qty DESC LIMIT ?
    `).all(days, limit);

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/stock-valuation
router.get('/stock-valuation', authenticate, (req, res) => {
    try {
        const products = db.prepare(`
      SELECT p.id, p.name, p.quantity, p.cost_price, p.selling_price,
             (p.quantity * p.cost_price) as cost_value,
             (p.quantity * p.selling_price) as retail_value,
             c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY retail_value DESC
    `).all();

        const totals = products.reduce((acc, p) => ({
            cost_value: acc.cost_value + p.cost_value,
            retail_value: acc.retail_value + p.retail_value,
            total_items: acc.total_items + p.quantity
        }), { cost_value: 0, retail_value: 0, total_items: 0 });

        res.json({ products, totals });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
