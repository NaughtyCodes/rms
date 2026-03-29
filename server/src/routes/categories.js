import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';

const router = Router();

// GET /api/categories
router.get('/', authenticate, (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM categories WHERE tenant_id = ? ORDER BY name').all(req.tenantId);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/categories
router.post('/', authenticate, authorizePermission('manage_categories'), (req, res) => {
    try {
        const { name, description, tax_rate } = req.body;
        if (!name) return res.status(400).json({ error: 'Category name is required.' });

        const result = db.prepare('INSERT INTO categories (tenant_id, name, description, tax_rate) VALUES (?, ?, ?, ?)')
            .run(req.tenantId, name, description || '', tax_rate || 0);
        res.status(201).json({ id: result.lastInsertRowid, name, description: description || '', tax_rate: tax_rate || 0, tenantId: req.tenantId });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Category already exists in your shop.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, authorizePermission('manage_categories'), (req, res) => {
    try {
        const { name, description, tax_rate } = req.body;
        const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
        if (!existing) return res.status(404).json({ error: 'Category not found.' });

        db.prepare('UPDATE categories SET name = ?, description = ?, tax_rate = ? WHERE id = ? AND tenant_id = ?')
            .run(name || existing.name, description ?? existing.description, tax_rate ?? existing.tax_rate, req.params.id, req.tenantId);

        res.json({ id: Number(req.params.id), name: name || existing.name, description: description ?? existing.description, tax_rate: tax_rate ?? existing.tax_rate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, authorizePermission('manage_categories'), (req, res) => {
    try {
        const result = db.prepare('DELETE FROM categories WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
        if (result.changes === 0) return res.status(404).json({ error: 'Category not found.' });
        res.json({ message: 'Category deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
