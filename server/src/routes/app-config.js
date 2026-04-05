import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeSuperAdmin, authorizeAdmin } from '../middleware/auth.js';

const router = Router();

// ─── GLOBAL APP CONFIG (SuperAdmin only) ────────────────────────────────────

// GET /api/app-config/global
router.get('/global', authenticate, authorizeSuperAdmin, (req, res) => {
    try {
        const configs = db.prepare('SELECT key, value, description, type, updated_at FROM app_config ORDER BY key').all();
        res.json(configs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/app-config/global/:key  (update value)
router.put('/global/:key', authenticate, authorizeSuperAdmin, (req, res) => {
    try {
        const { key } = req.params;
        const { value, description, type } = req.body;
        if (value === undefined) return res.status(400).json({ error: 'Value is required.' });

        const existing = db.prepare('SELECT key FROM app_config WHERE key = ?').get(key);
        if (!existing) return res.status(404).json({ error: 'Config key not found.' });

        db.prepare(`
            UPDATE app_config SET value = ?, description = ?, type = ?, updated_at = CURRENT_TIMESTAMP
            WHERE key = ?
        `).run(value, description || null, type || 'string', key);

        res.json({ key, value, message: 'Updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/app-config/global  (create new key)
router.post('/global', authenticate, authorizeSuperAdmin, (req, res) => {
    try {
        const { key, value, description, type } = req.body;
        if (!key || value === undefined) return res.status(400).json({ error: 'Key and value are required.' });

        db.prepare(`
            INSERT INTO app_config (key, value, description, type) VALUES (?, ?, ?, ?)
        `).run(key, value, description || '', type || 'string');

        res.status(201).json({ key, value, message: 'Created successfully.' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Config key already exists.' });
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/app-config/global/:key
router.delete('/global/:key', authenticate, authorizeSuperAdmin, (req, res) => {
    try {
        const { key } = req.params;
        const result = db.prepare('DELETE FROM app_config WHERE key = ?').run(key);
        if (result.changes === 0) return res.status(404).json({ error: 'Config key not found.' });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── TENANT SETTINGS (Admin) ─────────────────────────────────────────────────

// GET /api/app-config/tenant
router.get('/tenant', authenticate, authorizeAdmin, (req, res) => {
    try {
        const settings = db.prepare(`
            SELECT key, value FROM settings WHERE tenant_id = ? ORDER BY key
        `).all(req.tenantId);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/app-config/tenant/:key
router.put('/tenant/:key', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ error: 'Value is required.' });

        db.prepare(`
            INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?)
            ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value
        `).run(req.tenantId, key, value);

        res.json({ key, value, message: 'Updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/app-config/tenant  (create new setting key)
router.post('/tenant', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key || value === undefined) return res.status(400).json({ error: 'Key and value are required.' });

        db.prepare('INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?)').run(req.tenantId, key, value);
        res.status(201).json({ key, value, message: 'Created successfully.' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Setting key already exists for this tenant.' });
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/app-config/tenant/:key
router.delete('/tenant/:key', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { key } = req.params;
        const result = db.prepare('DELETE FROM settings WHERE tenant_id = ? AND key = ?').run(req.tenantId, key);
        if (result.changes === 0) return res.status(404).json({ error: 'Setting key not found.' });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
