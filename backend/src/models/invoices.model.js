const db = require('../db/database');
const inventoryModel = require('./inventory.model');

function resolveStockItemId(line) {
  if (line.stock_item_id) return Number(line.stock_item_id);
  if (line.create_new_item) {
    const created = inventoryModel.create({
      name: line.item_name,
      category: line.category || 'Otros',
      quantity: 0,
      unit: line.unit || 'Unidades',
      min_threshold: 0,
      cost_price: line.unit_price,
      ean: line.ean || null,
    });
    return created.id;
  }
  return null;
}

const itemsStmt = () => db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?');
const ivaStmt = () => db.prepare('SELECT * FROM invoice_iva_breakdown WHERE invoice_id = ? ORDER BY iva_rate ASC');

function attachDetails(invoice) {
  return {
    ...invoice,
    items: itemsStmt().all(invoice.id),
    iva_breakdown: ivaStmt().all(invoice.id),
  };
}

function all() {
  const invoices = db.prepare('SELECT * FROM invoices ORDER BY invoice_date DESC, id DESC').all();
  return invoices.map(attachDetails);
}

function findById(id) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!invoice) return null;
  return attachDetails(invoice);
}

function between(startDate, endDate) {
  const invoices = db.prepare(`
    SELECT * FROM invoices
    WHERE date(invoice_date) BETWEEN date(?) AND date(?)
    ORDER BY invoice_date DESC, id DESC
  `).all(startDate, endDate);
  return invoices.map(attachDetails);
}

function create(payload) {
  const { supplier_name, supplier_cif, invoice_number, invoice_date, payment_status, notes, items } = payload;
  const lineItems = Array.isArray(items) ? items : [];

  const linesWithTotals = lineItems.map((line) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unit_price);
    const ivaRate = Number(line.iva_rate) || 0;
    const lineTotal = quantity * unitPrice;
    const ivaAmount = lineTotal * (ivaRate / 100);
    return { ...line, quantity, unitPrice, ivaRate, lineTotal, ivaAmount };
  });

  const baseImponible = linesWithTotals.reduce((sum, l) => sum + l.lineTotal, 0);
  const ivaTotal = linesWithTotals.reduce((sum, l) => sum + l.ivaAmount, 0);
  const totalAmount = baseImponible + ivaTotal;

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (supplier_name, supplier_cif, invoice_number, invoice_date, total_amount, base_imponible, iva_total, payment_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = insertInvoice.run(
    supplier_name,
    supplier_cif || null,
    invoice_number,
    invoice_date,
    totalAmount,
    baseImponible,
    ivaTotal,
    payment_status || 'Pendiente',
    notes || null
  );
  const invoiceId = Number(result.lastInsertRowid);

  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, stock_item_id, item_name, quantity, unit_price, line_total, iva_rate, iva_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertIvaBreakdown = db.prepare(`
    INSERT INTO invoice_iva_breakdown (invoice_id, iva_rate, base_imponible, cuota_iva)
    VALUES (?, ?, ?, ?)
  `);

  const byRate = {};
  for (const line of linesWithTotals) {
    const stockItemId = resolveStockItemId(line);
    insertItem.run(invoiceId, stockItemId, line.item_name, line.quantity, line.unitPrice, line.lineTotal, line.ivaRate, line.ivaAmount);

    if (stockItemId) {
      inventoryModel.adjustQuantity(stockItemId, line.quantity, 'Compra (factura)', invoice_number);
    }

    if (!byRate[line.ivaRate]) byRate[line.ivaRate] = { base: 0, cuota: 0 };
    byRate[line.ivaRate].base += line.lineTotal;
    byRate[line.ivaRate].cuota += line.ivaAmount;
  }
  for (const [rate, totals] of Object.entries(byRate)) {
    insertIvaBreakdown.run(invoiceId, Number(rate), totals.base, totals.cuota);
  }

  return findById(invoiceId);
}

function updatePaymentStatus(id, payment_status) {
  db.prepare('UPDATE invoices SET payment_status = ? WHERE id = ?').run(payment_status, id);
  return findById(id);
}

function remove(id) {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
}

function monthlyExpense(year, month) {
  const monthStr = String(month).padStart(2, '0');
  const row = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) AS total
    FROM invoices
    WHERE strftime('%Y', invoice_date) = ? AND strftime('%m', invoice_date) = ?
  `).get(String(year), monthStr);
  return row.total;
}

function bySupplier() {
  return db.prepare(`
    SELECT
      supplier_name,
      MAX(supplier_cif) AS supplier_cif,
      COUNT(*) AS invoice_count,
      COALESCE(SUM(total_amount), 0) AS total_amount,
      COALESCE(SUM(base_imponible), 0) AS total_base,
      COALESCE(SUM(iva_total), 0) AS total_iva,
      SUM(CASE WHEN payment_status = 'Pendiente' THEN 1 ELSE 0 END) AS pending_count
    FROM invoices
    GROUP BY supplier_name
    ORDER BY total_amount DESC
  `).all();
}

module.exports = {
  all,
  findById,
  between,
  create,
  updatePaymentStatus,
  remove,
  monthlyExpense,
  bySupplier,
};
