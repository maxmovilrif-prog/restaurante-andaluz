const staffModel = require('../models/staff.model');
const consumptionsModel = require('../models/consumptions.model');

function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

function list(req, res) {
  res.json(staffModel.all());
}

function create(req, res) {
  const { name, pin } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  if (!isValidPin(pin)) return res.status(400).json({ error: 'El PIN debe tener exactamente 4 dígitos.' });
  if (staffModel.isPinTaken(pin)) return res.status(400).json({ error: 'Ese PIN ya está en uso por otro empleado activo.' });
  const staff = staffModel.create({ name: name.trim(), pin });
  res.status(201).json(staff);
}

function update(req, res) {
  const id = Number(req.params.id);
  const existing = staffModel.findById(id);
  if (!existing) return res.status(404).json({ error: 'Empleado no encontrado.' });

  const { name, active, pin } = req.body;
  if (pin !== undefined && pin !== '' && !isValidPin(pin)) {
    return res.status(400).json({ error: 'El PIN debe tener exactamente 4 dígitos.' });
  }
  if (pin && staffModel.isPinTaken(pin, id)) {
    return res.status(400).json({ error: 'Ese PIN ya está en uso por otro empleado activo.' });
  }
  const staff = staffModel.update(id, { name, active, pin: pin || undefined });
  res.json(staff);
}

function remove(req, res) {
  const id = Number(req.params.id);
  const existing = staffModel.findById(id);
  if (!existing) return res.status(404).json({ error: 'Empleado no encontrado.' });
  staffModel.remove(id);
  res.status(204).send();
}

function log(req, res) {
  const { start, end } = req.query;
  if (start && end) {
    return res.json(consumptionsModel.between(start, end));
  }
  res.json(consumptionsModel.all());
}

module.exports = { list, create, update, remove, log };
