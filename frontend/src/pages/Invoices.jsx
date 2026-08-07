import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Check, Upload, Building2, AlertTriangle, X } from 'lucide-react';
import { getInvoices, getInvoicesBySupplier, createInvoice, updateInvoiceStatus, deleteInvoice, parseInvoicePdf } from '../api/invoices';
import { getInventory } from '../api/inventory';
import { Card, Badge, Button, Input, Select } from '../components/ui';
import Modal from '../components/Modal';
import InvoiceImportModal from '../components/InvoiceImportModal';
import { formatCurrency, formatDate, todayISO } from '../utils/format';

const IVA_RATES = [0, 4, 10, 21];
const EMPTY_LINE = { item_name: '', stock_item_id: '', quantity: '', unit_price: '', iva_rate: 10 };
const EMPTY_FORM = {
  supplier_name: '',
  invoice_number: '',
  invoice_date: todayISO(),
  payment_status: 'Pendiente',
  notes: '',
  items: [{ ...EMPTY_LINE }],
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [bySupplier, setBySupplier] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [supplierFilter, setSupplierFilter] = useState('Todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [parsedInvoice, setParsedInvoice] = useState(null);
  const [importSaving, setImportSaving] = useState(false);
  const [importError, setImportError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([getInvoices(), getInventory(), getInvoicesBySupplier()])
      .then(([inv, stock, supplierSummary]) => {
        setInvoices(inv);
        setStockItems(stock);
        setBySupplier(supplierSummary);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filteredInvoices = useMemo(() => {
    if (supplierFilter === 'Todos') return invoices;
    return invoices.filter((inv) => inv.supplier_name === supplierFilter);
  }, [invoices, supplierFilter]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function updateLine(idx, field, value) {
    setForm((prev) => {
      const items = [...prev.items];
      const line = { ...items[idx], [field]: value };
      if (field === 'stock_item_id' && value) {
        const stockItem = stockItems.find((s) => String(s.id) === String(value));
        if (stockItem) {
          line.item_name = stockItem.name;
          if (!line.unit_price) line.unit_price = stockItem.cost_price;
        }
      }
      items[idx] = line;
      return { ...prev, items };
    });
  }

  function addLine() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_LINE }] }));
  }

  function removeLine(idx) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  }

  const formTotal = form.items.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0) * (1 + (Number(l.iva_rate) || 0) / 100),
    0
  );

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    if (!form.supplier_name.trim() || !form.invoice_number.trim() || !form.invoice_date) {
      return setFormError('Proveedor, número de factura y fecha son obligatorios.');
    }
    if (form.items.some((l) => !l.item_name.trim() || !Number(l.quantity) || Number(l.unit_price) < 0)) {
      return setFormError('Cada línea necesita artículo, cantidad y precio válidos.');
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        items: form.items.map((l) => ({
          item_name: l.item_name.trim(),
          stock_item_id: l.stock_item_id ? Number(l.stock_item_id) : null,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          iva_rate: Number(l.iva_rate) || 0,
        })),
      };
      await createInvoice(payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(invoice) {
    const newStatus = invoice.payment_status === 'Pagada' ? 'Pendiente' : 'Pagada';
    try {
      const updated = await updateInvoiceStatus(invoice.id, newStatus);
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? { ...inv, payment_status: updated.payment_status } : inv)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteInvoice(deleteTarget.id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const result = await parseInvoicePdf(file);
      setParsedInvoice(result);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleImportConfirm(payload) {
    setImportSaving(true);
    setImportError('');
    try {
      await createInvoice(payload);
      setParsedInvoice(null);
      load();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImportSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Facturas y Compras</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{invoices.length} facturas registradas</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelected} />
          <Button variant="secondary" onClick={handleUploadClick} disabled={uploading}>
            <Upload size={16} /> {uploading ? 'Leyendo PDF…' : 'Subir Factura PDF'}
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Nueva Factura
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">No se ha podido subir la factura</p>
            <p className="mt-0.5 text-red-600 dark:text-red-400">{uploadError}</p>
          </div>
          <button onClick={() => setUploadError('')} className="shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200">
            <X size={16} />
          </button>
        </div>
      )}

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Building2 size={16} className="text-neutral-400" />
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Resumen por Proveedor</h2>
        </div>
        {bySupplier.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin datos todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="pb-2 font-medium">Proveedor</th>
                  <th className="pb-2 font-medium">Facturas</th>
                  <th className="pb-2 font-medium">Base Imponible</th>
                  <th className="pb-2 font-medium">IVA</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {bySupplier.map((s) => (
                  <tr
                    key={s.supplier_name}
                    className={`cursor-pointer ${supplierFilter === s.supplier_name ? 'bg-orange-50 dark:bg-orange-950/20' : ''}`}
                    onClick={() => setSupplierFilter(supplierFilter === s.supplier_name ? 'Todos' : s.supplier_name)}
                  >
                    <td className="py-2 font-medium text-neutral-900 dark:text-neutral-100">
                      {s.supplier_name}
                      {s.supplier_cif && <span className="ml-2 text-xs text-neutral-400">{s.supplier_cif}</span>}
                    </td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-300">
                      {s.invoice_count}
                      {s.pending_count > 0 && (
                        <span className="ml-2">
                          <Badge tone="amber">{s.pending_count} pendiente{s.pending_count > 1 ? 's' : ''}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-300">{formatCurrency(s.total_base)}</td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-300">{formatCurrency(s.total_iva)}</td>
                    <td className="py-2 text-right font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(s.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {supplierFilter !== 'Todos' && (
          <button onClick={() => setSupplierFilter('Todos')} className="mt-3 text-xs text-orange-600 hover:underline dark:text-orange-400">
            Quitar filtro de proveedor ({supplierFilter})
          </button>
        )}
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-neutral-500 dark:text-neutral-400">Cargando facturas…</p>
        ) : error ? (
          <p className="p-5 text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        ) : filteredInvoices.length === 0 ? (
          <p className="p-5 text-sm text-neutral-500 dark:text-neutral-400">No hay facturas para mostrar.</p>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredInvoices.map((inv) => (
              <div key={inv.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <button
                    onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    {expandedId === inv.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {inv.supplier_name} <span className="text-neutral-400">· {inv.invoice_number}</span>
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(inv.invoice_date)}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(inv.total_amount)}</span>
                    <button onClick={() => toggleStatus(inv)}>
                      <Badge tone={inv.payment_status === 'Pagada' ? 'green' : 'amber'}>
                        {inv.payment_status === 'Pagada' && <Check size={12} className="mr-1 inline" />}
                        {inv.payment_status}
                      </Badge>
                    </button>
                    <button onClick={() => setDeleteTarget(inv)} className="rounded-md p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {expandedId === inv.id && (
                  <div className="bg-neutral-50 px-5 py-3 dark:bg-neutral-800/40">
                    {inv.supplier_cif && (
                      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">CIF: {inv.supplier_cif}</p>
                    )}
                    {inv.notes && <p className="mb-2 text-xs italic text-neutral-500 dark:text-neutral-400">{inv.notes}</p>}
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-neutral-500 dark:text-neutral-400">
                          <th className="pb-1.5 font-medium">Artículo</th>
                          <th className="pb-1.5 font-medium">Cantidad</th>
                          <th className="pb-1.5 font-medium">Precio Unit.</th>
                          <th className="pb-1.5 font-medium">IVA</th>
                          <th className="pb-1.5 text-right font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((line) => (
                          <tr key={line.id}>
                            <td className="py-1 text-neutral-800 dark:text-neutral-200">{line.item_name}</td>
                            <td className="py-1 text-neutral-600 dark:text-neutral-300">{line.quantity}</td>
                            <td className="py-1 text-neutral-600 dark:text-neutral-300">{formatCurrency(line.unit_price)}</td>
                            <td className="py-1 text-neutral-600 dark:text-neutral-300">{line.iva_rate}%</td>
                            <td className="py-1 text-right text-neutral-800 dark:text-neutral-200">{formatCurrency(line.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {inv.iva_breakdown && inv.iva_breakdown.length > 0 && (
                      <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">Desglose de IVA</p>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-neutral-500 dark:text-neutral-400">
                              <th className="pb-1 font-medium">Tipo IVA</th>
                              <th className="pb-1 font-medium">Base Imponible</th>
                              <th className="pb-1 text-right font-medium">Cuota IVA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.iva_breakdown.map((row) => (
                              <tr key={row.id}>
                                <td className="py-0.5 text-neutral-700 dark:text-neutral-300">{row.iva_rate}%</td>
                                <td className="py-0.5 text-neutral-700 dark:text-neutral-300">{formatCurrency(row.base_imponible)}</td>
                                <td className="py-0.5 text-right text-neutral-700 dark:text-neutral-300">{formatCurrency(row.cuota_iva)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-1.5 flex justify-end gap-4 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          <span>Base: {formatCurrency(inv.base_imponible)}</span>
                          <span>IVA: {formatCurrency(inv.iva_total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title="Nueva Factura de Proveedor"
        wide
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar Factura'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Proveedor" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="p.ej. Cárnicas del Sur" />
            <Input label="Nº Factura" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="FAC-2026-0001" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha" type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
            <Select label="Estado de Pago" value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}>
              <option value="Pendiente">Pendiente</option>
              <option value="Pagada">Pagada</option>
            </Select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Artículos de la Factura</span>
              <Button type="button" variant="secondary" onClick={addLine} className="!px-2.5 !py-1 text-xs">
                <Plus size={14} /> Añadir línea
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
                  <div className="col-span-3">
                    <Select
                      label={idx === 0 ? 'Artículo de stock (opcional)' : undefined}
                      value={line.stock_item_id}
                      onChange={(e) => updateLine(idx, 'stock_item_id', e.target.value)}
                    >
                      <option value="">— Manual —</option>
                      {stockItems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      label={idx === 0 ? 'Nombre' : undefined}
                      value={line.item_name}
                      onChange={(e) => updateLine(idx, 'item_name', e.target.value)}
                      placeholder="Nombre del artículo"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label={idx === 0 ? 'Cantidad' : undefined}
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label={idx === 0 ? 'Precio (€)' : undefined}
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Select label={idx === 0 ? 'IVA' : undefined} value={line.iva_rate} onChange={(e) => updateLine(idx, 'iva_rate', e.target.value)}>
                      {IVA_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={form.items.length === 1}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-950"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input label="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionales..." />

          <div className="flex justify-end border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Total (con IVA): {formatCurrency(formTotal)}</p>
          </div>
        </form>
      </Modal>

      <InvoiceImportModal
        open={!!parsedInvoice}
        parsed={parsedInvoice}
        stockItems={stockItems}
        onClose={() => {
          setParsedInvoice(null);
          setImportError('');
        }}
        onConfirm={handleImportConfirm}
        saving={importSaving}
        error={importError}
      />

      <Modal
        open={!!deleteTarget}
        title="Eliminar Factura"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          ¿Seguro que quieres eliminar la factura <strong>{deleteTarget?.invoice_number}</strong> de {deleteTarget?.supplier_name}? Esta acción no revierte el stock añadido.
        </p>
      </Modal>
    </div>
  );
}
