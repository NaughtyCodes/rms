import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Ensure backup directory exists
const backupDir = path.resolve(__dirname, '../../data/backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Multer setup for restoring database files
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, backupDir),
    filename: (req, file, cb) => cb(null, 'restore_temp.db')
});
const upload = multer({ storage });

// POST /api/backup-restore/create
router.post('/create', authenticate, authorizePermission('manage_settings'), async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.db`;
        const filepath = path.join(backupDir, filename);

        // SQLite Specific: Native backup guarantees consistent snapshot even with WAL enabled
        await db.backup(filepath);

        res.json({ message: 'Backup created successfully', file: filename });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/backup-restore/list
router.get('/list', authenticate, authorizePermission('manage_settings'), (req, res) => {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
            .map(f => {
                const stat = fs.statSync(path.join(backupDir, f));
                return {
                    name: f,
                    size: stat.size,
                    date: stat.mtime
                };
            })
            .sort((a, b) => b.date - a.date);

        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/backup-restore/download/:filename
router.get('/download/:filename', authenticate, authorizePermission('manage_settings'), (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(backupDir, filename);
        
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Backup file not found' });
        }
        res.download(filepath);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/backup-restore/restore
router.post('/restore', authenticate, authorizePermission('manage_settings'), upload.single('database'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const restorePath = req.file.path;
        const targetPath = path.resolve(__dirname, '../../data/shop.db');
        const walPath = path.resolve(__dirname, '../../data/shop.db-wal');
        const shmPath = path.resolve(__dirname, '../../data/shop.db-shm');

        // To safely restore, we should ideally close the DB connection, copy the file, and restart.
        // Since we are running in Node, we will copy the file and signal the admin to restart the server manually
        // Or we attempt to close, replace and crash intentionally to trigger process manager reboot (like nodemon/pm2)
        
        db.close();
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
        
        fs.copyFileSync(restorePath, targetPath);
        fs.unlinkSync(restorePath);

        // Crash the server intentionally to restart and reconnect to new DB
        // If running via standard `node` it stops; if via `nodemon` or `pm2` it auto-restarts successfully.
        setTimeout(() => process.exit(0), 1000);

        res.json({ message: 'Database restored successfully. Server is restarting to apply changes.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
