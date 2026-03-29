import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizePermission } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
        const rows = db.prepare('SELECT key, value FROM settings WHERE tenant_id IS ?').all(req.tenantId);
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

        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



const uploadMiddleware = (req, res, next) => {
    upload.single('logo')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

// POST /api/settings/upload-logo
router.post('/upload-logo', authenticate, authorizePermission('manage_settings'), uploadMiddleware, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filename = 'processed-' + req.file.filename;
        const processedPath = path.join(__dirname, '../../uploads', filename);
        
        // Read file into buffer to avoid EBUSY lock on Windows when unlinking
        const inputBuffer = fs.readFileSync(req.file.path);
        
        // Resize and optimize the image using sharp
        await sharp(inputBuffer)
            .resize({ width: 500, withoutEnlargement: true }) // Resize to 500px max width
            .toFile(processedPath);

        // Delete the original raw upload to save space
        fs.unlinkSync(req.file.path);

        const logoUrl = `/uploads/${filename}`;
        
        // Update the shop_logo_url setting in the database
        const checkStmt = db.prepare('SELECT id FROM settings WHERE tenant_id IS ? AND key = ?');
        const existing = checkStmt.get(req.tenantId, 'shop_logo_url');

        if (existing) {
            db.prepare('UPDATE settings SET value = ? WHERE id = ?').run(logoUrl, existing.id);
        } else {
            db.prepare('INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?)').run(req.tenantId, 'shop_logo_url', logoUrl);
        }

        res.json({ 
            message: 'Logo uploaded and optimized successfully',
            logo_url: logoUrl
        });
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: err.message });
    }
});

export default router;
