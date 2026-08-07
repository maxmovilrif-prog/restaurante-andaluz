const authModel = require('../models/auth.model');
const { verifyPin, signToken } = require('../utils/auth');

function isValidPinFormat(pin) {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin);
}

function adminLogin(req, res) {
  const { pin } = req.body;
  const credentials = authModel.getAdminCredentials();
  if (!credentials) {
    return res.status(500).json({ error: 'No hay un PIN de administrador configurado.' });
  }
  if (!pin || !verifyPin(pin, credentials.pin_hash)) {
    return res.status(401).json({ error: 'PIN incorrecto.' });
  }
  const token = signToken({ role: 'admin' });
  res.json({ token });
}

function changeAdminPin(req, res) {
  const { currentPin, newPin } = req.body;
  const credentials = authModel.getAdminCredentials();
  if (!credentials || !verifyPin(currentPin, credentials.pin_hash)) {
    return res.status(401).json({ error: 'El PIN actual no es correcto.' });
  }
  if (!isValidPinFormat(newPin)) {
    return res.status(400).json({ error: 'El nuevo PIN debe tener entre 4 y 6 dígitos.' });
  }
  authModel.setAdminPin(newPin);
  res.json({ success: true });
}

function verifySession(req, res) {
  res.json({ role: req.admin.role });
}

module.exports = { adminLogin, changeAdminPin, verifySession, isValidPinFormat };
