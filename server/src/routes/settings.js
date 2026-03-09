import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpg, png, webp) are allowed'));
    }
});

export const DEFAULT_SETTINGS = {
    shop_name: 'My Shop',
    shop_address: '123 Main Street, City',
    shop_description: 'Thank you for shopping with us!',
    shop_phone: '',
    shop_email: '',
    shop_gstin: '',
    shop_logo_url: '',
    theme: 'light',
    tax_mode: 'product', // 'product' or 'category'
    bill_layout: 'standard',
    bill_layout_style: 'modern',
    bill_paper_size: '80mm',
    bill_show_logo: 'false',
    bill_footer_text: 'Thank you for shopping with us!',
    bill_watermark_text: 'PAID',
    bill_watermark_opacity: '0.1',
    bill_show_watermark: 'false',
    bill_terms: '',
    bill_show_qr: 'false',
    bill_upi_id: '',
    font_family: 'Inter'
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

// POST /api/settings/upload-logo
router.post('/upload-logo', authenticate, authorizeAdmin, upload.single('logo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const logoUrl = `/uploads/${req.file.filename}`;
        
        // Update the shop_logo_url setting in the database
        const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
        stmt.run('shop_logo_url', logoUrl);

        res.json({ 
            message: 'Logo uploaded successfully',
            logo_url: logoUrl
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
