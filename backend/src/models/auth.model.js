const db = require('../db/database');
const { hashPin } = require('../utils/auth');

function getAdminCredentials() {
  return db.prepare('SELECT * FROM admin_credentials WHERE id = 1').get();
}

function setAdminPin(pin) {
  const pinHash = hashPin(pin);
  const existing = getAdminCredentials();
  if (existing) {
    db.prepare(`UPDATE admin_credentials SET pin_hash = ?, updated_at = datetime('now') WHERE id = 1`).run(pinHash);
  } else {
    db.prepare(`INSERT INTO admin_credentials (id, pin_hash) VALUES (1, ?)`).run(pinHash);
  }
}

module.exports = { getAdminCredentials, setAdminPin };
