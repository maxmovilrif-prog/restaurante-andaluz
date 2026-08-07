const { PDFParse } = require('pdf-parse');

const ITEM_LINE_RE =
  /^(\d{4,7})\*?\s*(.+?)\s+(\d{8,14})\s+(?:(\d+)\s+)?([\d.]+,\d{2})\s+([\d.]+,\d{2,3})\s+([\d.]+,\d{2})\s+(\d{1,2},\d{1,2})\s+([\d.]+,\d{2,3})\s*$/;
const HEADER_ROW_RE = /^(\d{6,10})\s+([A-Z]{0,3}\s?\d{3,9})\s+(\d{2}-\d{2}-\d{1}\.?\d{3,4})\s+HORA:\s+(\d{2}:\d{2}:\d{2})\s+(\d+)$/;
const CIF_RE = /C\.I\.F\.\s*:?\s*([A-Z]-?\d{7,8})/;
const SUPPLIER_NAME_RE = /([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ,.'-]{3,60}S\.(?:A|L|COOP)\.)/;
const IVA_ROW_RE = /^(\d{1,2},\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})$/;
const TOTAL_ROW_RE = /^TOTAL\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})$/;
const GENERIC_INVOICE_NUMBER_RE = /(?:N[ÚU]M(?:ERO)?\.?\s*(?:DE\s*)?FACTURA|FACTURA\s*N[ºO°]?)\s*[:.]?\s*([A-Z]{0,3}[ -]?\d[A-Z0-9/-]{2,19})/i;
const GENERIC_DATE_RE = /(\d{2})[-/](\d{2})[-/](\d{1}\.?\d{3}|\d{4})/;

function parseEsNumber(str) {
  if (!str) return 0;
  const normalized = String(str).replace(/\./g, '').replace(',', '.');
  const value = parseFloat(normalized);
  return Number.isNaN(value) ? 0 : value;
}

function parseEsDate(str) {
  const m = str.match(/^(\d{2})[-/](\d{2})[-/](\d{1}\.?\d{3}|\d{4})$/);
  if (!m) return null;
  const [, day, month, yearRaw] = m;
  const year = yearRaw.replace('.', '').padStart(4, '0');
  return `${year}-${month}-${day}`;
}

async function extractText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

function normalizeLines(rawText) {
  return rawText
    .split('\n')
    .map((line) => line.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseInvoiceText(rawText) {
  const lines = normalizeLines(rawText);

  let supplierName = null;
  let supplierCif = null;
  let invoiceNumber = null;
  let invoiceDate = null;
  let totalAmount = null;
  const items = [];
  const ivaBreakdown = [];

  const headerSearchText = lines.slice(0, 20).join('\n');
  const supplierMatch = headerSearchText.match(SUPPLIER_NAME_RE);
  if (supplierMatch) {
    supplierName = supplierMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Pass 1: the structured "COD./CLE. NUM.FACTURA FECHA ... HORA ..." data row, if present, is the
  // most reliable source for invoice number + date — check it across all lines before any fallback.
  for (const line of lines) {
    const headerMatch = line.match(HEADER_ROW_RE);
    if (headerMatch) {
      invoiceNumber = headerMatch[2].replace(/\s+/g, ' ').trim();
      invoiceDate = parseEsDate(headerMatch[3]);
      break;
    }
  }

  for (const line of lines) {
    if (!supplierCif) {
      const cifMatch = line.match(CIF_RE);
      if (cifMatch) supplierCif = cifMatch[1];
    }

    if (!invoiceNumber) {
      const genericNumMatch = line.match(GENERIC_INVOICE_NUMBER_RE);
      if (genericNumMatch) invoiceNumber = genericNumMatch[1].trim();
    }

    if (!invoiceDate) {
      const genericDateMatch = line.match(GENERIC_DATE_RE);
      if (genericDateMatch) invoiceDate = parseEsDate(genericDateMatch[0]);
    }

    const itemMatch = line.match(ITEM_LINE_RE);
    if (itemMatch) {
      const [, code, desc, ean, , qty, price, importe, ivaRate, precioInc] = itemMatch;
      items.push({
        code,
        description: desc.replace(/\s+/g, ' ').trim(),
        ean,
        quantity: parseEsNumber(qty),
        unit_price: parseEsNumber(price),
        line_total: parseEsNumber(importe),
        iva_rate: parseEsNumber(ivaRate),
        unit_price_with_iva: parseEsNumber(precioInc),
      });
      continue;
    }

    const ivaMatch = line.match(IVA_ROW_RE);
    if (ivaMatch) {
      ivaBreakdown.push({
        iva_rate: parseEsNumber(ivaMatch[1]),
        base_imponible: parseEsNumber(ivaMatch[2]),
        cuota_iva: parseEsNumber(ivaMatch[3]),
      });
      continue;
    }

    const totalMatch = line.match(TOTAL_ROW_RE);
    if (totalMatch) {
      totalAmount = parseEsNumber(totalMatch[4]);
    }
  }

  const baseImponible = ivaBreakdown.reduce((sum, r) => sum + r.base_imponible, 0) || items.reduce((sum, i) => sum + i.line_total, 0);
  const ivaTotal = ivaBreakdown.reduce((sum, r) => sum + r.cuota_iva, 0) || items.reduce((sum, i) => sum + i.line_total * (i.iva_rate / 100), 0);

  return {
    supplier_name: supplierName,
    supplier_cif: supplierCif,
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    total_amount: totalAmount ?? baseImponible + ivaTotal,
    base_imponible: baseImponible,
    iva_total: ivaTotal,
    items,
    iva_breakdown: ivaBreakdown,
  };
}

async function parseInvoicePdf(buffer) {
  const rawText = await extractText(buffer);
  const parsed = parseInvoiceText(rawText);
  return { ...parsed, raw_text: rawText };
}

module.exports = { parseInvoicePdf, parseInvoiceText, parseEsNumber, parseEsDate };
