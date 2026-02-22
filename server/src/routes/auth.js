import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shop-billing-secret';

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            user: { id: user.id, username: user.username, role: user.role, fullName: user.full_name }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/register (admin only)
router.post('/register', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { username, password, fullName, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
        ).run(username, hash, fullName || '', role || 'cashier');

        res.status(201).json({ id: result.lastInsertRowid, username, role: role || 'cashier' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Username already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

export default router;
