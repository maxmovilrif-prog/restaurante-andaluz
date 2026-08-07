const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const inventoryModel = require('../models/inventory.model');
const invoicesModel = require('../models/invoices.model');

function resolveRange(req) {
  const { start, end } = req.query;
  const endDate = end || new Date().toISOString().slice(0, 10);
  const startDate = start || '2000-01-01';
  return { startDate, endDate };
}

function usageCsv(req, res) {
  const { startDate, endDate } = resolveRange(req);
  const movements = inventoryModel.movementsBetween(startDate, endDate);
  const fields = [
    { label: 'Fecha', value: 'created_at' },
    { label: 'Artículo', value: 'item_name' },
    { label: 'Categoría', value: 'item_category' },
    { label: 'Cambio', value: 'change_amount' },
    { label: 'Unidad', value: 'item_unit' },
    { label: 'Motivo', value: 'reason' },
    { label: 'Referencia', value: 'reference' },
  ];
  const parser = new Parser({ fields });
  const csv = parser.parse(movements);
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.attachment(`uso-inventario_${startDate}_a_${endDate}.csv`);
  res.send('﻿' + csv);
}

function invoicesCsv(req, res) {
  const { startDate, endDate } = resolveRange(req);
  const invoices = invoicesModel.between(startDate, endDate);
  const fields = [
    { label: 'Fecha', value: 'invoice_date' },
    { label: 'Proveedor', value: 'supplier_name' },
    { label: 'Nº Factura', value: 'invoice_number' },
    { label: 'Importe Total (€)', value: 'total_amount' },
    { label: 'Estado', value: 'payment_status' },
  ];
  const parser = new Parser({ fields });
  const csv = parser.parse(invoices);
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.attachment(`facturas_${startDate}_a_${endDate}.csv`);
  res.send('﻿' + csv);
}

function invoicesPdf(req, res) {
  const { startDate, endDate } = resolveRange(req);
  const invoices = invoicesModel.between(startDate, endDate);
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.header('Content-Type', 'application/pdf');
  res.attachment(`informe-facturas_${startDate}_a_${endDate}.pdf`);
  doc.pipe(res);

  doc.fontSize(18).text('Restaurante Andaluz', { align: 'left' });
  doc.fontSize(12).fillColor('#555').text('Informe de Facturas de Proveedores', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#888').text(`Periodo: ${startDate} a ${endDate}`);
  doc.moveDown(1);
  doc.fillColor('#000');

  const tableTop = doc.y;
  const columns = [
    { label: 'Fecha', width: 70 },
    { label: 'Proveedor', width: 150 },
    { label: 'Nº Factura', width: 100 },
    { label: 'Estado', width: 80 },
    { label: 'Total (€)', width: 80 },
  ];

  let x = doc.x;
  let y = tableTop;
  doc.font('Helvetica-Bold').fontSize(10);
  columns.forEach((col) => {
    doc.text(col.label, x, y, { width: col.width });
    x += col.width;
  });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10);

  invoices.forEach((inv) => {
    x = doc.x;
    y = doc.y;
    if (y > 750) {
      doc.addPage();
      y = doc.y;
    }
    const row = [inv.invoice_date, inv.supplier_name, inv.invoice_number, inv.payment_status, inv.total_amount.toFixed(2)];
    row.forEach((val, i) => {
      doc.text(String(val), x, y, { width: columns[i].width });
      x += columns[i].width;
    });
    doc.moveDown(0.3);
  });

  doc.moveDown(1);
  doc.font('Helvetica-Bold').text(`Total del periodo: €${totalAmount.toFixed(2)}`, { align: 'right' });
  doc.font('Helvetica-Bold').text(`Número de facturas: ${invoices.length}`, { align: 'right' });

  doc.end();
}

module.exports = { usageCsv, invoicesCsv, invoicesPdf };
