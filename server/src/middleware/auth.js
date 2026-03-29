import jwt from 'jsonwebtoken';
import db from '../db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'shop-billing-secret';

export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        
        // Ensure tenant isolation
        req.tenantId = decoded.tenantId; 
        
        // Fetch current permissions for the user (union of all roles)
        const permissions = db.prepare(`
            SELECT DISTINCT p.name 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ?
        `).all(decoded.id).map(p => p.name);

        req.user.permissions = permissions;
        
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

export function authorizePermission(permission) {
    return (req, res, next) => {
        // Superadmin always has all permissions or skip check if they are system-wide
        if (req.user.role === 'superadmin') return next();

        if (!req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: `Access denied. Required permission: ${permission}` });
        }
        next();
    };
}

export function authorizeAdmin(req, res, next) {
    // Legacy support: check for admin role or manage_users permission
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.permissions.includes('manage_users')) {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Admin permissions required.' });
}

export function authorizeSuperAdmin(req, res, next) {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied. SuperAdmin permissions required.' });
    }
    next();
}
