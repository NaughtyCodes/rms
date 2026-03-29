import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
import { startBackupScheduler } from '../services/backupScheduler.js';

const router = Router();

// GET /api/system-config
router.get('/', authenticate, authorizePermission('manage_settings'), (req, res) => {
    try {
        const rows = db.prepare('SELECT key, value FROM settings WHERE tenant_id IS ?').all(req.tenantId);
        const config = {
            db_client: 'sqlite3',
            db_host: '',
            db_port: '',
            db_user: '',
            db_password: '',
            db_name: '',
            backup_schedule: 'None',
            backup_location: './data/backups',
            backup_email_enabled: 'false',
            backup_email_from: '',
            backup_email_pass: '',
            backup_email_to: ''
        };
        rows.forEach(row => {
            if (config.hasOwnProperty(row.key)) {
                config[row.key] = row.value;
            }
        });
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/system-config
router.put('/', authenticate, authorizePermission('manage_settings'), (req, res) => {
    try {
        const settings = req.body;
        const checkStmt = db.prepare('SELECT id FROM settings WHERE tenant_id IS ? AND key = ?');
        const updateStmt = db.prepare('UPDATE settings SET value = ? WHERE id = ?');
        const insertStmt = db.prepare('INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?)');

        const bulkUpdate = db.transaction((entries) => {
            for (const [key, value] of entries) {
                const existing = checkStmt.get(req.tenantId, key);
                if (existing) {
                    updateStmt.run(String(value), existing.id);
                } else {
                    insertStmt.run(req.tenantId, key, String(value));
                }
            }
        });

        bulkUpdate(Object.entries(settings));
        
        // Reload scheduler
        startBackupScheduler();

        res.json({ message: 'System configuration saved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
