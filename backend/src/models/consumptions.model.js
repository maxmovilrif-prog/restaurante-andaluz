const db = require('../db/database');

function create({ staff_id, staff_name, stock_item_id, item_name, quantity, unit, unit_cost }) {
  const totalCost = quantity * unit_cost;
  const result = db.prepare(`
    INSERT INTO staff_consumptions (staff_id, staff_name, stock_item_id, item_name, quantity, unit, unit_cost, total_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(staff_id, staff_name, stock_item_id, item_name, quantity, unit, unit_cost, totalCost);
  return db.prepare('SELECT * FROM staff_consumptions WHERE id = ?').get(Number(result.lastInsertRowid));
}

function all() {
  return db.prepare('SELECT * FROM staff_consumptions ORDER BY created_at DESC, id DESC').all();
}

function between(startDate, endDate) {
  return db.prepare(`
    SELECT * FROM staff_consumptions
    WHERE date(created_at) BETWEEN date(?) AND date(?)
    ORDER BY created_at DESC, id DESC
  `).all(startDate, endDate);
}

function recent(limit = 10) {
  return db.prepare('SELECT * FROM staff_consumptions ORDER BY created_at DESC, id DESC LIMIT ?').all(limit);
}

function monthlyCost(year, month) {
  const monthStr = String(month).padStart(2, '0');
  const row = db.prepare(`
    SELECT COALESCE(SUM(total_cost), 0) AS total
    FROM staff_consumptions
    WHERE strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?
  `).get(String(year), monthStr);
  return row.total;
}

module.exports = { create, all, between, recent, monthlyCost };
