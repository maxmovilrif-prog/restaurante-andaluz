const db = require('../db/database');

function all() {
  return db.prepare('SELECT * FROM stock_items ORDER BY name ASC').all();
}

function findById(id) {
  return db.prepare('SELECT * FROM stock_items WHERE id = ?').get(id);
}

function create(item) {
  const stmt = db.prepare(`
    INSERT INTO stock_items (name, category, quantity, unit, min_threshold, cost_price, ean, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(item.name, item.category, item.quantity ?? 0, item.unit, item.min_threshold ?? 0, item.cost_price ?? 0, item.ean || null);
  return findById(Number(result.lastInsertRowid));
}

function update(id, item) {
  const existing = findById(id);
  const stmt = db.prepare(`
    UPDATE stock_items
    SET name = ?, category = ?, quantity = ?, unit = ?, min_threshold = ?, cost_price = ?, ean = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(item.name, item.category, item.quantity, item.unit, item.min_threshold, item.cost_price, item.ean !== undefined ? item.ean : existing.ean, id);
  return findById(id);
}

function findByEan(ean) {
  if (!ean) return null;
  return db.prepare('SELECT * FROM stock_items WHERE ean = ?').get(ean);
}

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findByNameFuzzy(name) {
  const target = normalizeName(name);
  if (!target) return null;
  const items = all();
  const exact = items.find((item) => normalizeName(item.name) === target);
  if (exact) return exact;
  return items.find((item) => {
    const itemNorm = normalizeName(item.name);
    return itemNorm.includes(target) || target.includes(itemNorm);
  }) || null;
}

function remove(id) {
  db.prepare('DELETE FROM stock_items WHERE id = ?').run(id);
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function adjustQuantity(id, changeAmount, reason, reference = null) {
  const item = findById(id);
  if (!item) return null;
  const newQuantity = round3(Math.max(0, item.quantity + changeAmount));
  const actualChange = round3(newQuantity - item.quantity);
  db.prepare(`UPDATE stock_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(newQuantity, id);
  db.prepare(`INSERT INTO stock_movements (stock_item_id, change_amount, reason, reference) VALUES (?, ?, ?, ?)`)
    .run(id, actualChange, reason, reference);
  return findById(id);
}

function recentMovements(limit = 10) {
  return db.prepare(`
    SELECT sm.*, si.name AS item_name, si.unit AS item_unit
    FROM stock_movements sm
    JOIN stock_items si ON si.id = sm.stock_item_id
    ORDER BY sm.created_at DESC, sm.id DESC
    LIMIT ?
  `).all(limit);
}

function movementsBetween(startDate, endDate) {
  return db.prepare(`
    SELECT sm.*, si.name AS item_name, si.unit AS item_unit, si.category AS item_category
    FROM stock_movements sm
    JOIN stock_items si ON si.id = sm.stock_item_id
    WHERE date(sm.created_at) BETWEEN date(?) AND date(?)
    ORDER BY sm.created_at DESC
  `).all(startDate, endDate);
}

function lowStock() {
  return db.prepare('SELECT * FROM stock_items WHERE quantity <= min_threshold ORDER BY (quantity - min_threshold) ASC').all();
}

function totalStockValue() {
  const row = db.prepare('SELECT COALESCE(SUM(quantity * cost_price), 0) AS total FROM stock_items').get();
  return row.total;
}

module.exports = {
  all,
  findById,
  findByEan,
  findByNameFuzzy,
  create,
  update,
  remove,
  adjustQuantity,
  recentMovements,
  movementsBetween,
  lowStock,
  totalStockValue,
};
