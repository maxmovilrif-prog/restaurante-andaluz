const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');

const inventoryRoutes = require('./routes/inventory.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportsRoutes = require('./routes/reports.routes');
const authRoutes = require('./routes/auth.routes');
const staffRoutes = require('./routes/staff.routes');
const staffAdminRoutes = require('./routes/staffAdmin.routes');
const requireAdmin = require('./middleware/requireAdmin');

const app = express();

// Origins allowed to call the API cross-origin (comma-separated in CORS_ORIGINS).
// Only matters if the frontend is hosted on a different origin than the API — see
// the "same-origin production serving" block below for the simpler single-server setup.
const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      // Requests with no Origin header (curl, server-to-server, same-origin) are always allowed.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Auth: admin login is public, everything else under /api/auth is protected inside the router itself.
app.use('/api/auth', authRoutes);

// Staff-facing: public, PIN-gated per-action (fast access for waiters/kitchen, no session login).
app.use('/api/staff', staffRoutes);

// Admin-only: financial data, inventory management, invoices, reports, staff management/log.
app.use('/api/inventory', requireAdmin, inventoryRoutes);
app.use('/api/invoices', requireAdmin, invoicesRoutes);
app.use('/api/dashboard', requireAdmin, dashboardRoutes);
app.use('/api/reports', requireAdmin, reportsRoutes);
app.use('/api/admin/staff', requireAdmin, staffAdminRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Production: serve the built frontend from this same Node process (same-origin, no CORS
// needed for the app itself). Run `npm run build` at the repo root first.
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // No frontend build alongside this process (e.g. backend deployed as its own
  // Render service, frontend as a separate Static Site) — respond on "/" instead
  // of falling through to Express's bare "Cannot GET /" 404.
  app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Restaurante Andaluz API', health: '/api/health' });
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.message?.startsWith('Origen no permitido') ? 403 : 500).json({
    error: err.message?.startsWith('Origen no permitido') ? err.message : 'Error interno del servidor.',
  });
});

module.exports = app;
