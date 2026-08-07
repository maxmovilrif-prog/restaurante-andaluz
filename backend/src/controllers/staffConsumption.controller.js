const db = require('../db/database');
const inventoryModel = require('../models/inventory.model');
const staffModel = require('../models/staff.model');
const consumptionsModel = require('../models/consumptions.model');

function listConsumableItems(req, res) {
  const items = inventoryModel.all();
  const simplified = items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity,
  }));
  res.json(simplified);
}

function consume(req, res) {
  const { pin, items } = req.body;

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'Introduce tu PIN.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos un artículo.' });
  }

  const staffMember = staffModel.findByPin(pin);
  if (!staffMember) {
    return res.status(401).json({ error: 'PIN incorrecto.' });
  }

  const resolvedLines = [];
  for (const line of items) {
    const quantity = Number(line.quantity);
    if (!line.stock_item_id || Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Cada artículo necesita una cantidad válida.' });
    }
    const stockItem = inventoryModel.findById(Number(line.stock_item_id));
    if (!stockItem) {
      return res.status(404).json({ error: `Artículo no encontrado (ID ${line.stock_item_id}).` });
    }
    if (quantity > stockItem.quantity) {
      return res.status(400).json({ error: `No hay suficiente stock de "${stockItem.name}" (disponible: ${stockItem.quantity} ${stockItem.unit}).` });
    }
    resolvedLines.push({ stockItem, quantity });
  }

  const results = [];
  let totalCost = 0;

  db.exec('BEGIN');
  try {
    for (const { stockItem, quantity } of resolvedLines) {
      inventoryModel.adjustQuantity(stockItem.id, -quantity, 'Consumo Interno / Gastos Internos', staffMember.name);
      const consumption = consumptionsModel.create({
        staff_id: staffMember.id,
        staff_name: staffMember.name,
        stock_item_id: stockItem.id,
        item_name: stockItem.name,
        quantity,
        unit: stockItem.unit,
        unit_cost: stockItem.cost_price,
      });
      totalCost += consumption.total_cost;
      results.push(consumption);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.status(201).json({ staff_name: staffMember.name, items: results, total_cost: totalCost });
}

module.exports = { listConsumableItems, consume };
