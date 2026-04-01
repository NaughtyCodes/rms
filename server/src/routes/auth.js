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

        const permissions = db.prepare(`
            SELECT DISTINCT p.name 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id AND rp.tenant_id = ?
            JOIN user_roles ur ON rp.role_id = ur.role_id AND ur.tenant_id = ?
            WHERE ur.user_id = ?
        `).all(user.tenant_id, user.tenant_id, user.id).map(p => p.name);

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                fullName: user.full_name, 
                branchId: user.branch_id,
                tenantId: user.tenant_id,
                permissions
            },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                fullName: user.full_name, 
                branchId: user.branch_id,
                tenantId: user.tenant_id,
                permissions
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/register (admin only, creates user in SAME tenant as current admin)
router.post('/register', authenticate, authorizeAdmin, (req, res) => {
    try {
        const { username, password, fullName, role, branchId } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        // Only superadmins can create other superadmins. 
        // Normal admins can only create users within their own tenant.
        if (role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only SuperAdmins can create other SuperAdmins.' });
        }

        const tenantId = req.user.tenantId; // Inherit tenant from the creator

        const hash = bcrypt.hashSync(password, 10);
        
        const result = db.transaction(() => {
            const insertResult = db.prepare(
                'INSERT INTO users (username, password_hash, full_name, role, branch_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(username, hash, fullName || '', role || 'cashier', branchId || null, tenantId);
            
            const userId = insertResult.lastInsertRowid;
            const targetRoleName = role || 'cashier';
            const roleRec = db.prepare('SELECT id FROM roles WHERE name = ? AND tenant_id = ?').get(targetRoleName, tenantId);
            
            if (roleRec) {
                db.prepare('INSERT INTO user_roles (tenant_id, user_id, role_id) VALUES (?, ?, ?)').run(tenantId, userId, roleRec.id);
            }
            
            return insertResult;
        })();

        res.status(201).json({ id: result.lastInsertRowid, username, role: role || 'cashier', branchId, tenantId });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Username already exists in this tenant.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

export default router;
