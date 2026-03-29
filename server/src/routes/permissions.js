import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/permissions
// Returns all available system permissions grouped by category
router.get('/', authenticate, authorizeAdmin, (req, res) => {
    try {
        const permissions = db.prepare('SELECT * FROM permissions ORDER BY category, name').all();
        
        // Group by category if needed for UI
        const grouped = permissions.reduce((acc, perm) => {
            if (!acc[perm.category]) acc[perm.category] = [];
            acc[perm.category].push(perm);
            return acc;
        }, {});

        res.json(grouped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
