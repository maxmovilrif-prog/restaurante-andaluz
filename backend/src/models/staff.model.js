const db = require('../db/database');
const { hashPin, verifyPin } = require('../utils/auth');

function all() {
  return db.prepare('SELECT id, name, active, created_at FROM staff ORDER BY active DESC, name ASC').all();
}

function findById(id) {
  return db.prepare('SELECT id, name, active, created_at FROM staff WHERE id = ?').get(id);
}

function activeStaffList() {
  return db.prepare('SELECT id, pin_hash, name FROM staff WHERE active = 1').all();
}

function findByPin(pin) {
  const candidates = activeStaffList();
  return candidates.find((s) => verifyPin(pin, s.pin_hash)) || null;
}

function create({ name, pin }) {
  const pinHash = hashPin(pin);
  const result = db.prepare('INSERT INTO staff (name, pin_hash, active) VALUES (?, ?, 1)').run(name, pinHash);
  return findById(Number(result.lastInsertRowid));
}

function update(id, { name, active, pin }) {
  const existing = findById(id);
  if (!existing) return null;
  const newName = name !== undefined ? name : existing.name;
  const newActive = active !== undefined ? (active ? 1 : 0) : existing.active;
  if (pin) {
    const pinHash = hashPin(pin);
    db.prepare('UPDATE staff SET name = ?, active = ?, pin_hash = ? WHERE id = ?').run(newName, newActive, pinHash, id);
  } else {
    db.prepare('UPDATE staff SET name = ?, active = ? WHERE id = ?').run(newName, newActive, id);
  }
  return findById(id);
}

function remove(id) {
  db.prepare('DELETE FROM staff WHERE id = ?').run(id);
}

function isPinTaken(pin, excludeId = null) {
  const candidates = activeStaffList().filter((s) => excludeId === null || s.id !== excludeId);
  return candidates.some((s) => verifyPin(pin, s.pin_hash));
}

module.exports = { all, findById, findByPin, create, update, remove, isPinTaken };
