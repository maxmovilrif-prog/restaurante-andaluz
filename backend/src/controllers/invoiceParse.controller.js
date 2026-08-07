const { parseInvoicePdf } = require('../services/invoiceParser');
const inventoryModel = require('../models/inventory.model');

function guessUnit(description) {
  const d = String(description || '').toLowerCase();
  if (/\bkg\.?\b|\bkilo/.test(d)) return 'Kg';
  if (/\bl\.?\b|\blt\.?\b|\blitro/.test(d)) return 'Litros';
  if (/\bcaja|\bpack|\bp-\d/.test(d)) return 'Cajas';
  return 'Unidades';
}

function guessCategory(description) {
  const d = String(description || '').toLowerCase();
  if (/leche|queso|yogur|nata|mantequilla/.test(d)) return 'Otros';
  if (/cerveza|vino|agua|refresco|cola|zumo|bebida/.test(d)) return 'Bebidas';
  if (/carne|pollo|cerdo|vacuno|jamon|embutido|burguer|hamburgu/.test(d)) return 'Carnes';
  if (/pescado|marisco|gamba|pulpo|bacalao|atun/.test(d)) return 'Pesca';
  if (/tomate|pimiento|cebolla|patata|lechuga|verdura|fruta/.test(d)) return 'Verduras';
  if (/lejia|detergente|papel|guante|limpi|friegasuelos|fregona|vajillas/.test(d)) return 'Limpieza';
  return 'Otros';
}

function matchLine(line) {
  let matched = null;
  let matchType = 'none';
  try {
    matched = inventoryModel.findByEan(line.ean);
    if (matched) {
      matchType = 'ean';
    } else {
      matched = inventoryModel.findByNameFuzzy(line.description);
      if (matched) matchType = 'name';
    }
  } catch (err) {
    // A single bad line (e.g. missing/odd description) should never take down the whole import.
    console.error('Error matching invoice line against inventory:', line, err);
  }

  return {
    description: line.description,
    ean: line.ean,
    quantity: line.quantity,
    unit_price: line.unit_price,
    line_total: line.line_total,
    iva_rate: line.iva_rate,
    matched_stock_item_id: matched ? matched.id : null,
    matched_stock_item_name: matched ? matched.name : null,
    match_type: matchType,
    suggested_category: matched ? matched.category : guessCategory(line.description),
    suggested_unit: matched ? matched.unit : guessUnit(line.description),
  };
}

async function parsePdf(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Sube un archivo PDF de factura.' });
  }
  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'El archivo debe ser un PDF.' });
  }

  let parsed;
  try {
    parsed = await parseInvoicePdf(req.file.buffer);
  } catch (err) {
    console.error('Error parsing PDF invoice:', err);
    return res.status(422).json({ error: 'No se ha podido leer el PDF. Verifica que sea una factura válida.' });
  }

  try {
    const items = (parsed.items || []).map(matchLine);

    res.json({
      supplier_name: parsed.supplier_name,
      supplier_cif: parsed.supplier_cif,
      invoice_number: parsed.invoice_number,
      invoice_date: parsed.invoice_date,
      total_amount: parsed.total_amount,
      base_imponible: parsed.base_imponible,
      iva_total: parsed.iva_total,
      iva_breakdown: parsed.iva_breakdown,
      items,
      unmatched_count: items.filter((i) => i.match_type === 'none').length,
    });
  } catch (err) {
    console.error('Error matching parsed invoice against inventory:', err);
    res.status(500).json({ error: 'La factura se leyó pero hubo un error al comparar los artículos con el inventario.' });
  }
}

module.exports = { parsePdf };
