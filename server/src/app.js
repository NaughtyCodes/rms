import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/init.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import invoiceRoutes from './routes/invoices.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import metaRoutes from './routes/meta.js';
import inventoryRoutes from './routes/inventory.js';
import taxRoutes from './routes/taxes.js';
import discountRoutes from './routes/discounts.js';
import { seedDefaultAdmin } from './db/seed.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize DB
initializeDatabase();
seedDefaultAdmin();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/meta-fields', metaRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/discounts', discountRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
