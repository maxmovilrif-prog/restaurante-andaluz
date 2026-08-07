import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button, Input, Select } from './ui';
import Modal from './Modal';
import { CATEGORIES, UNITS } from '../api/inventory';
import { formatCurrency } from '../utils/format';

const IVA_RATES = [0, 4, 10, 21];

function buildLineState(item) {
  return {
    description: item.description,
    ean: item.ean,
    quantity: item.quantity,
    unit_price: item.unit_price,
    iva_rate: IVA_RATES.includes(item.iva_rate) ? item.iva_rate : 21,
    mode: item.matched_stock_item_id ? 'existing' : 'new',
    stock_item_id: item.matched_stock_item_id || '',
    category: item.suggested_category,
    unit: item.suggested_unit,
    included: true,
  };
}

export default function InvoiceImportModal({ open, parsed, stockItems, onClose, onConfirm, saving, error }) {
  const [header, setHeader] = useState(null);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (parsed) {
      setHeader({
        supplier_name: parsed.supplier_name || '',
        supplier_cif: parsed.supplier_cif || '',
        invoice_number: parsed.invoice_number || '',
        invoice_date: parsed.invoice_date || '',
        payment_status: 'Pendiente',
      });
      setLines(parsed.items.map(buildLineState));
    }
  }, [parsed]);

  if (!open || !header) return null;

  function updateLine(idx, patch) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  const includedLines = lines.filter((l) => l.included);
  const total = includedLines.reduce((sum, l) => sum + l.quantity * l.unit_price * (1 + l.iva_rate / 100), 0);
  const matchedCount = lines.filter((l) => l.mode === 'existing').length;
  const newCount = lines.filter((l) => l.mode === 'new').length;

  function handleConfirm() {
    const payload = {
      supplier_name: header.supplier_name,
      supplier_cif: header.supplier_cif,
      invoice_number: header.invoice_number,
      invoice_date: header.invoice_date,
      payment_status: header.payment_status,
      notes: 'Importada automáticamente desde PDF',
      items: includedLines.map((l) => ({
        item_name: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        iva_rate: l.iva_rate,
        ean: l.ean || null,
        stock_item_id: l.mode === 'existing' && l.stock_item_id ? Number(l.stock_item_id) : null,
        create_new_item: l.mode === 'new',
        category: l.mode === 'new' ? l.category : undefined,
        unit: l.mode === 'new' ? l.unit : undefined,
      })),
    };
    onConfirm(payload);
  }

  return (
    <Modal
      open={open}
      title="Revisar Factura Importada"
      wide
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || includedLines.length === 0}>
            {saving ? 'Importando…' : `Importar Factura (${formatCurrency(total)})`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

        <div className="flex items-center gap-4 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} /> {matchedCount} coincidencias en inventario
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={14} /> {newCount} artículos nuevos por crear
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Proveedor" value={header.supplier_name} onChange={(e) => setHeader({ ...header, supplier_name: e.target.value })} />
          <Input label="CIF" value={header.supplier_cif} onChange={(e) => setHeader({ ...header, supplier_cif: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Nº Factura" value={header.invoice_number} onChange={(e) => setHeader({ ...header, invoice_number: e.target.value })} />
          <Input label="Fecha" type="date" value={header.invoice_date} onChange={(e) => setHeader({ ...header, invoice_date: e.target.value })} />
          <Select label="Estado de Pago" value={header.payment_status} onChange={(e) => setHeader({ ...header, payment_status: e.target.value })}>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagada">Pagada</option>
          </Select>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Artículos ({lines.length} líneas detectadas)
          </p>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-2.5 ${line.included ? 'border-neutral-200 dark:border-neutral-700' : 'border-neutral-100 opacity-50 dark:border-neutral-800'}`}
              >
                <div className="mb-2 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={line.included}
                    onChange={(e) => updateLine(idx, { included: e.target.checked })}
                    className="mt-2.5 h-4 w-4 rounded border-neutral-300"
                  />
                  <div className="flex-1">
                    <Input value={line.description} onChange={(e) => updateLine(idx, { description: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2 pl-6">
                  <div className="col-span-4">
                    <Select
                      value={line.mode === 'existing' ? line.stock_item_id : 'new'}
                      onChange={(e) =>
                        e.target.value === 'new'
                          ? updateLine(idx, { mode: 'new' })
                          : updateLine(idx, { mode: 'existing', stock_item_id: e.target.value })
                      }
                    >
                      <option value="new">+ Crear artículo nuevo</option>
                      {stockItems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.01" min="0" value={line.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.001" min="0" value={line.unit_price} onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Select value={line.iva_rate} onChange={(e) => updateLine(idx, { iva_rate: Number(e.target.value) })}>
                      {IVA_RATES.map((r) => (
                        <option key={r} value={r}>
                          IVA {r}%
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center justify-end text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {formatCurrency(line.quantity * line.unit_price * (1 + line.iva_rate / 100))}
                  </div>
                  {line.mode === 'new' && (
                    <>
                      <div className="col-span-6">
                        <Select value={line.category} onChange={(e) => updateLine(idx, { category: e.target.value })}>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="col-span-6">
                        <Select value={line.unit} onChange={(e) => updateLine(idx, { unit: e.target.value })}>
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
