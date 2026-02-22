import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = Router();

export const DEFAULT_SETTINGS = {
    shop_name: 'My Shop',
    shop_address: '123 Main Street, City',
    shop_description: 'Thank you for shopping with us!',
    theme: 'dark',
    tax_mode: 'product', // 'product' or 'category'
    bill_layout: 'standard'
};

// GET /api/settings
router.get('/', authenticate, (req, res) => {
    try {
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = { ...DEFAULT_SETTINGS };
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings
router.put('/', authenticate, authorizeAdmin, (req, res) => {
    try {
        const settings = req.body;

        const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');

        const bulkUpdate = db.transaction((entries) => {
            for (const [key, value] of entries) {
                stmt.run(key, String(value));
            }
        });

        bulkUpdate(Object.entries(settings));

        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
