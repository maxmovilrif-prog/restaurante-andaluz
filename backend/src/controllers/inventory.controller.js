const inventoryModel = require('../models/inventory.model');

const CATEGORIES = ['Bebidas', 'Carnes', 'Pesca', 'Limpieza', 'Verduras', 'Otros'];
const UNITS = ['Kg', 'Litros', 'Unidades', 'Cajas'];

function validateItemPayload(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) errors.push('El nombre es obligatorio.');
  }
  if (!partial || body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) errors.push(`La categoría debe ser una de: ${CATEGORIES.join(', ')}.`);
  }
  if (!partial || body.unit !== undefined) {
    if (!UNITS.includes(body.unit)) errors.push(`La unidad debe ser una de: ${UNITS.join(', ')}.`);
  }
  if (body.quantity !== undefined && Number.isNaN(Number(body.quantity))) errors.push('La cantidad debe ser numérica.');
  if (body.min_threshold !== undefined && Number.isNaN(Number(body.min_threshold))) errors.push('El umbral mínimo debe ser numérico.');
  if (body.cost_price !== undefined && Number.isNaN(Number(body.cost_price))) errors.push('El precio de coste debe ser numérico.');
  return errors;
}

function list(req, res) {
  const items = inventoryModel.all();
  res.json(items);
}

function getOne(req, res) {
  const item = inventoryModel.findById(Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Artículo no encontrado.' });
  res.json(item);
}

function create(req, res) {
  const errors = validateItemPayload(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  const item = inventoryModel.create({
    name: req.body.name.trim(),
    category: req.body.category,
    quantity: Number(req.body.quantity ?? 0),
    unit: req.body.unit,
    min_threshold: Number(req.body.min_threshold ?? 0),
    cost_price: Number(req.body.cost_price ?? 0),
    ean: req.body.ean ? String(req.body.ean).trim() : null,
  });
  res.status(201).json(item);
}

function update(req, res) {
  const id = Number(req.params.id);
  const existing = inventoryModel.findById(id);
  if (!existing) return res.status(404).json({ error: 'Artículo no encontrado.' });

  const errors = validateItemPayload(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const merged = {
    name: req.body.name !== undefined ? req.body.name.trim() : existing.name,
    category: req.body.category !== undefined ? req.body.category : existing.category,
    quantity: req.body.quantity !== undefined ? Number(req.body.quantity) : existing.quantity,
    unit: req.body.unit !== undefined ? req.body.unit : existing.unit,
    min_threshold: req.body.min_threshold !== undefined ? Number(req.body.min_threshold) : existing.min_threshold,
    cost_price: req.body.cost_price !== undefined ? Number(req.body.cost_price) : existing.cost_price,
    ean: req.body.ean !== undefined ? (req.body.ean ? String(req.body.ean).trim() : null) : existing.ean,
  };
  const item = inventoryModel.update(id, merged);
  res.json(item);
}

function remove(req, res) {
  const id = Number(req.params.id);
  const existing = inventoryModel.findById(id);
  if (!existing) return res.status(404).json({ error: 'Artículo no encontrado.' });
  inventoryModel.remove(id);
  res.status(204).send();
}

function adjust(req, res) {
  const id = Number(req.params.id);
  const amount = Number(req.body.amount);
  if (Number.isNaN(amount) || amount === 0) {
    return res.status(400).json({ error: 'El importe de ajuste debe ser un número distinto de cero.' });
  }
  const existing = inventoryModel.findById(id);
  if (!existing) return res.status(404).json({ error: 'Artículo no encontrado.' });
  const reason = req.body.reason || (amount > 0 ? 'Ajuste manual (+)' : 'Ajuste manual (-)');
  const item = inventoryModel.adjustQuantity(id, amount, reason);
  res.json(item);
}

function movements(req, res) {
  const { start, end } = req.query;
  if (start && end) {
    return res.json(inventoryModel.movementsBetween(start, end));
  }
  const limit = Number(req.query.limit) || 10;
  res.json(inventoryModel.recentMovements(limit));
}

module.exports = { list, getOne, create, update, remove, adjust, movements, CATEGORIES, UNITS };
