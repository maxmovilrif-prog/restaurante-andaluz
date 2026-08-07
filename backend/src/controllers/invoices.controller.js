const invoicesModel = require('../models/invoices.model');

function validatePayload(body) {
  const errors = [];
  if (!body.supplier_name || !body.supplier_name.trim()) errors.push('El nombre del proveedor es obligatorio.');
  if (!body.invoice_number || !body.invoice_number.trim()) errors.push('El número de factura es obligatorio.');
  if (!body.invoice_date) errors.push('La fecha de la factura es obligatoria.');
  if (body.payment_status && !['Pagada', 'Pendiente'].includes(body.payment_status)) {
    errors.push('El estado de pago debe ser "Pagada" o "Pendiente".');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push('La factura debe incluir al menos un artículo.');
  } else {
    body.items.forEach((line, idx) => {
      if (!line.item_name || !line.item_name.trim()) errors.push(`La línea ${idx + 1} necesita un nombre de artículo.`);
      if (Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0) errors.push(`La línea ${idx + 1} necesita una cantidad válida.`);
      if (Number.isNaN(Number(line.unit_price)) || Number(line.unit_price) < 0) errors.push(`La línea ${idx + 1} necesita un precio unitario válido.`);
      if (line.iva_rate !== undefined && (Number.isNaN(Number(line.iva_rate)) || Number(line.iva_rate) < 0 || Number(line.iva_rate) > 100)) {
        errors.push(`La línea ${idx + 1} necesita un tipo de IVA válido (0-100).`);
      }
    });
  }
  return errors;
}

function list(req, res) {
  const { start, end } = req.query;
  if (start && end) {
    return res.json(invoicesModel.between(start, end));
  }
  res.json(invoicesModel.all());
}

function getOne(req, res) {
  const invoice = invoicesModel.findById(Number(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada.' });
  res.json(invoice);
}

function create(req, res) {
  const errors = validatePayload(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  const invoice = invoicesModel.create(req.body);
  res.status(201).json(invoice);
}

function updateStatus(req, res) {
  const id = Number(req.params.id);
  const existing = invoicesModel.findById(id);
  if (!existing) return res.status(404).json({ error: 'Factura no encontrada.' });
  if (!['Pagada', 'Pendiente'].includes(req.body.payment_status)) {
    return res.status(400).json({ error: 'El estado de pago debe ser "Pagada" o "Pendiente".' });
  }
  res.json(invoicesModel.updatePaymentStatus(id, req.body.payment_status));
}

function remove(req, res) {
  const id = Number(req.params.id);
  const existing = invoicesModel.findById(id);
  if (!existing) return res.status(404).json({ error: 'Factura no encontrada.' });
  invoicesModel.remove(id);
  res.status(204).send();
}

function bySupplier(req, res) {
  res.json(invoicesModel.bySupplier());
}

module.exports = { list, getOne, create, updateStatus, remove, bySupplier };
