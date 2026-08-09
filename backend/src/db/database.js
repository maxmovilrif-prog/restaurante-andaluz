const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const getDataDir = require('../utils/dataDir');

const dbPath = path.join(getDataDir(), 'restaurante.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS stock_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Bebidas', 'Carnes', 'Pesca', 'Limpieza', 'Verduras', 'Otros')),
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL CHECK (unit IN ('Kg', 'Litros', 'Unidades', 'Cajas')),
    min_threshold REAL NOT NULL DEFAULT 0,
    cost_price REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_name TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('Pagada', 'Pendiente')) DEFAULT 'Pendiente',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    change_amount REAL NOT NULL,
    reason TEXT NOT NULL,
    reference TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoice_iva_breakdown (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    iva_rate REAL NOT NULL,
    base_imponible REAL NOT NULL,
    cuota_iva REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_credentials (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    pin_hash TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS staff_consumptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    staff_name TEXT NOT NULL,
    stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('stock_items', 'ean', 'TEXT');
ensureColumn('suppliers', 'cif', 'TEXT');
ensureColumn('invoices', 'supplier_cif', 'TEXT');
ensureColumn('invoices', 'base_imponible', 'REAL');
ensureColumn('invoices', 'iva_total', 'REAL');
ensureColumn('invoice_items', 'iva_rate', 'REAL NOT NULL DEFAULT 0');
ensureColumn('invoice_items', 'iva_amount', 'REAL NOT NULL DEFAULT 0');

module.exports = db;
