const db = require('./database');
const authModel = require('../models/auth.model');
const staffModel = require('../models/staff.model');
const consumptionsModel = require('../models/consumptions.model');
const inventoryModel = require('../models/inventory.model');

const stockItems = [
  { name: 'Café en grano', category: 'Otros', quantity: 12, unit: 'Kg', min_threshold: 5, cost_price: 9.5 },
  { name: 'Coca-Cola (botellín)', category: 'Bebidas', quantity: 80, unit: 'Unidades', min_threshold: 48, cost_price: 0.55 },
  { name: 'Cerveza Cruzcampo', category: 'Bebidas', quantity: 120, unit: 'Unidades', min_threshold: 60, cost_price: 0.6 },
  { name: 'Vino Fino Jerez', category: 'Bebidas', quantity: 18, unit: 'Unidades', min_threshold: 12, cost_price: 4.2 },
  { name: 'Agua Mineral', category: 'Bebidas', quantity: 150, unit: 'Unidades', min_threshold: 50, cost_price: 0.3 },
  { name: 'Carne de Vacuno', category: 'Carnes', quantity: 8, unit: 'Kg', min_threshold: 10, cost_price: 14.5 },
  { name: 'Solomillo de Cerdo', category: 'Carnes', quantity: 6, unit: 'Kg', min_threshold: 5, cost_price: 11 },
  { name: 'Pollo de Corral', category: 'Carnes', quantity: 15, unit: 'Kg', min_threshold: 8, cost_price: 6.8 },
  { name: 'Jamón Ibérico', category: 'Carnes', quantity: 4, unit: 'Kg', min_threshold: 3, cost_price: 45 },
  { name: 'Pescado (Boquerones)', category: 'Pesca', quantity: 3, unit: 'Kg', min_threshold: 5, cost_price: 8.9 },
  { name: 'Gambas Blancas', category: 'Pesca', quantity: 5, unit: 'Kg', min_threshold: 4, cost_price: 22 },
  { name: 'Pulpo', category: 'Pesca', quantity: 7, unit: 'Kg', min_threshold: 4, cost_price: 18.5 },
  { name: 'Bacalao', category: 'Pesca', quantity: 6, unit: 'Kg', min_threshold: 5, cost_price: 13.2 },
  { name: 'Tomate', category: 'Verduras', quantity: 20, unit: 'Kg', min_threshold: 10, cost_price: 1.8 },
  { name: 'Pimiento', category: 'Verduras', quantity: 14, unit: 'Kg', min_threshold: 8, cost_price: 2.1 },
  { name: 'Cebolla', category: 'Verduras', quantity: 25, unit: 'Kg', min_threshold: 10, cost_price: 0.9 },
  { name: 'Patata', category: 'Verduras', quantity: 40, unit: 'Kg', min_threshold: 15, cost_price: 0.7 },
  { name: 'Aceite de Oliva Virgen Extra', category: 'Otros', quantity: 9, unit: 'Litros', min_threshold: 10, cost_price: 5.4 },
  { name: 'Vinagre de Jerez', category: 'Otros', quantity: 6, unit: 'Litros', min_threshold: 3, cost_price: 3.6 },
  { name: 'Pan (barras)', category: 'Otros', quantity: 30, unit: 'Unidades', min_threshold: 20, cost_price: 0.45 },
  { name: 'Detergente Lavavajillas', category: 'Limpieza', quantity: 4, unit: 'Litros', min_threshold: 5, cost_price: 3.1 },
  { name: 'Lejía', category: 'Limpieza', quantity: 8, unit: 'Litros', min_threshold: 4, cost_price: 1.5 },
  { name: 'Papel de Cocina', category: 'Limpieza', quantity: 10, unit: 'Cajas', min_threshold: 6, cost_price: 12 },
  { name: 'Guantes Desechables', category: 'Limpieza', quantity: 5, unit: 'Cajas', min_threshold: 6, cost_price: 7.5 },
];

const suppliers = [
  { name: 'Distribuciones Andaluzas S.L.', cif: 'B-14098765' },
  { name: 'Mercapesca Cádiz', cif: 'B-11223344' },
  { name: 'Cárnicas del Sur', cif: 'B-41556677' },
  { name: 'Bebidas Guadalquivir', cif: 'B-41889900' },
  { name: 'Limpiezas Higiénicas S.A.', cif: 'A-29334455' },
];

const staffMembers = [
  { name: 'Badr Hamoumi', pin: '1111' },
  { name: 'Lucía Ortega', pin: '2222' },
  { name: 'Manuel Reyes', pin: '3333' },
];

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function seed({ fresh = false } = {}) {
  db.exec(`
    DELETE FROM staff_consumptions;
    DELETE FROM staff;
    DELETE FROM admin_credentials;
    DELETE FROM invoice_iva_breakdown;
    DELETE FROM invoice_items;
    DELETE FROM invoices;
    DELETE FROM stock_movements;
    DELETE FROM stock_items;
    DELETE FROM suppliers;
  `);
  db.exec(`
    DELETE FROM sqlite_sequence WHERE name IN
    ('stock_items','invoices','invoice_items','stock_movements','invoice_iva_breakdown','staff','staff_consumptions');
  `);

  if (fresh) {
    const pin = process.env.ADMIN_PIN || randomPin();
    authModel.setAdminPin(pin);
    console.log('Base de datos inicializada vacía (sin datos de ejemplo).');
    console.log(`PIN de administrador: ${pin} — apúntalo ahora, no se puede recuperar, solo cambiar.`);
    console.log('Añade artículos de inventario y empleados desde el Panel de Administración.');
    return;
  }

  authModel.setAdminPin('1234');

  const insertItem = db.prepare(`
    INSERT INTO stock_items (name, category, quantity, unit, min_threshold, cost_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const itemIds = {};
  for (const item of stockItems) {
    const result = insertItem.run(item.name, item.category, item.quantity, item.unit, item.min_threshold, item.cost_price);
    itemIds[item.name] = Number(result.lastInsertRowid);
  }

  const insertSupplier = db.prepare('INSERT INTO suppliers (name, cif) VALUES (?, ?)');
  for (const s of suppliers) insertSupplier.run(s.name, s.cif);
  const supplierCif = Object.fromEntries(suppliers.map((s) => [s.name, s.cif]));

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (supplier_name, supplier_cif, invoice_number, invoice_date, total_amount, base_imponible, iva_total, payment_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertInvoiceItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, stock_item_id, item_name, quantity, unit_price, line_total, iva_rate, iva_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertIvaBreakdown = db.prepare(`
    INSERT INTO invoice_iva_breakdown (invoice_id, iva_rate, base_imponible, cuota_iva)
    VALUES (?, ?, ?, ?)
  `);
  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (stock_item_id, change_amount, reason, reference)
    VALUES (?, ?, ?, ?)
  `);

  const sampleInvoices = [
    {
      supplier_name: 'Cárnicas del Sur',
      invoice_number: 'FAC-2026-0141',
      invoice_date: '2026-07-28',
      payment_status: 'Pagada',
      notes: 'Pedido semanal de carnes',
      lines: [
        { name: 'Carne de Vacuno', quantity: 10, unit_price: 14.5, iva_rate: 4 },
        { name: 'Pollo de Corral', quantity: 12, unit_price: 6.8, iva_rate: 4 },
      ],
    },
    {
      supplier_name: 'Mercapesca Cádiz',
      invoice_number: 'FAC-2026-0298',
      invoice_date: '2026-07-30',
      payment_status: 'Pendiente',
      notes: 'Pescado fresco de lonja',
      lines: [
        { name: 'Gambas Blancas', quantity: 6, unit_price: 22, iva_rate: 4 },
        { name: 'Pulpo', quantity: 4, unit_price: 18.5, iva_rate: 4 },
      ],
    },
    {
      supplier_name: 'Bebidas Guadalquivir',
      invoice_number: 'FAC-2026-0552',
      invoice_date: '2026-08-01',
      payment_status: 'Pagada',
      notes: 'Reposición de bebidas',
      lines: [
        { name: 'Coca-Cola (botellín)', quantity: 48, unit_price: 0.55, iva_rate: 21 },
        { name: 'Cerveza Cruzcampo', quantity: 96, unit_price: 0.6, iva_rate: 21 },
      ],
    },
    {
      supplier_name: 'Distribuciones Andaluzas S.L.',
      invoice_number: 'FAC-2026-0603',
      invoice_date: '2026-08-03',
      payment_status: 'Pendiente',
      notes: 'Aceite y productos básicos',
      lines: [
        { name: 'Aceite de Oliva Virgen Extra', quantity: 20, unit_price: 5.4, iva_rate: 4 },
        { name: 'Tomate', quantity: 15, unit_price: 1.8, iva_rate: 4 },
      ],
    },
  ];

  for (const inv of sampleInvoices) {
    const linesWithTotals = inv.lines.map((l) => {
      const lineTotal = l.quantity * l.unit_price;
      const ivaAmount = lineTotal * (l.iva_rate / 100);
      return { ...l, lineTotal, ivaAmount };
    });
    const baseImponible = linesWithTotals.reduce((sum, l) => sum + l.lineTotal, 0);
    const ivaTotal = linesWithTotals.reduce((sum, l) => sum + l.ivaAmount, 0);
    const total = baseImponible + ivaTotal;

    const result = insertInvoice.run(
      inv.supplier_name,
      supplierCif[inv.supplier_name] || null,
      inv.invoice_number,
      inv.invoice_date,
      total,
      baseImponible,
      ivaTotal,
      inv.payment_status,
      inv.notes
    );
    const invoiceId = Number(result.lastInsertRowid);

    for (const line of linesWithTotals) {
      const stockItemId = itemIds[line.name] || null;
      insertInvoiceItem.run(invoiceId, stockItemId, line.name, line.quantity, line.unit_price, line.lineTotal, line.iva_rate, line.ivaAmount);
      if (stockItemId) {
        insertMovement.run(stockItemId, line.quantity, 'Compra (factura)', inv.invoice_number);
      }
    }

    const byRate = {};
    for (const line of linesWithTotals) {
      if (!byRate[line.iva_rate]) byRate[line.iva_rate] = { base: 0, cuota: 0 };
      byRate[line.iva_rate].base += line.lineTotal;
      byRate[line.iva_rate].cuota += line.ivaAmount;
    }
    for (const [rate, totals] of Object.entries(byRate)) {
      insertIvaBreakdown.run(invoiceId, Number(rate), totals.base, totals.cuota);
    }
  }

  const createdStaff = staffMembers.map((s) => staffModel.create(s));

  const sampleConsumptions = [
    { staffIndex: 0, item: 'Coca-Cola (botellín)', quantity: 2 },
    { staffIndex: 1, item: 'Café en grano', quantity: 0.1 },
    { staffIndex: 2, item: 'Agua Mineral', quantity: 3 },
    { staffIndex: 0, item: 'Pan (barras)', quantity: 1 },
  ];
  for (const c of sampleConsumptions) {
    const stockItem = inventoryModel.findById(itemIds[c.item]);
    if (!stockItem) continue;
    const staffMember = createdStaff[c.staffIndex];
    inventoryModel.adjustQuantity(stockItem.id, -c.quantity, 'Consumo Interno / Gastos Internos', staffMember.name);
    consumptionsModel.create({
      staff_id: staffMember.id,
      staff_name: staffMember.name,
      stock_item_id: stockItem.id,
      item_name: stockItem.name,
      quantity: c.quantity,
      unit: stockItem.unit,
      unit_cost: stockItem.cost_price,
    });
  }

  console.log(`Seed completado: ${stockItems.length} artículos, ${suppliers.length} proveedores, ${sampleInvoices.length} facturas.`);
  console.log(`PIN de administrador: 1234 (cámbialo desde el panel de administración).`);
  console.log(`Personal de ejemplo: ${staffMembers.map((s) => `${s.name} (PIN ${s.pin})`).join(', ')}`);
}

seed({ fresh: process.argv.includes('--fresh') });
