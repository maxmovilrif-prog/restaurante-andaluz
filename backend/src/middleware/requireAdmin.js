const { verifyToken } = require('../utils/auth');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Acceso restringido. Inicia sesión como administrador.' });
  }
  req.admin = payload;
  next();
}

module.exports = requireAdmin;
