import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { getInvoices } from '../api/invoices';
import { getMovementsBetween } from '../api/inventory';
import { downloadReport } from '../api/reports';
import { Card, Badge, Button, Input } from '../components/ui';
import { formatCurrency, formatDate, formatDateTime, todayISO } from '../utils/format';

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: 'Hoy', start: () => todayISO(), end: () => todayISO() },
  { label: 'Última Semana', start: () => isoDaysAgo(7), end: () => todayISO() },
  { label: 'Último Mes', start: () => isoDaysAgo(30), end: () => todayISO() },
];

export default function Reports() {
  const [start, setStart] = useState(isoDaysAgo(30));
  const [end, setEnd] = useState(todayISO());
  const [invoices, setInvoices] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    Promise.all([getInvoices({ start, end }), getMovementsBetween(start, end)])
      .then(([inv, mov]) => {
        setInvoices(inv);
        setMovements(mov);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalIncoming = movements.filter((m) => m.change_amount > 0).reduce((s, m) => s + m.change_amount, 0);
  const totalOutgoing = movements.filter((m) => m.change_amount < 0).reduce((s, m) => s + Math.abs(m.change_amount), 0);

  async function handleDownload(path, fallbackName) {
    setDownloadError('');
    try {
      await downloadReport(path, { start, end }, fallbackName);
    } catch (err) {
      setDownloadError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Informes de Gastos y Consumo</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Filtra por periodo y exporta a CSV o PDF</p>
      </div>

      <Card className="!p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Desde" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <Input label="Hasta" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            <Button onClick={load}>Aplicar Filtro</Button>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setStart(p.start());
                    setEnd(p.end());
                  }}
                  className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button variant="secondary" onClick={() => handleDownload('/reports/invoices.csv', 'facturas.csv')}>
              <FileSpreadsheet size={16} /> Facturas (CSV)
            </Button>
            <Button variant="secondary" onClick={() => handleDownload('/reports/invoices.pdf', 'informe-facturas.pdf')}>
              <FileText size={16} /> Facturas (PDF)
            </Button>
            <Button variant="secondary" onClick={() => handleDownload('/reports/usage.csv', 'uso-inventario.csv')}>
              <Download size={16} /> Consumo de Inventario (CSV)
            </Button>
          </div>
          {downloadError && <p className="text-sm text-red-600 dark:text-red-400">Error: {downloadError}</p>}
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Cargando datos del periodo…</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Facturado</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(totalInvoiced)}</p>
              <p className="mt-1 text-xs text-neutral-400">{invoices.length} facturas en el periodo</p>
            </Card>
            <Card>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Entradas de Stock</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">+{totalIncoming.toFixed(2)}</p>
              <p className="mt-1 text-xs text-neutral-400">unidades recibidas</p>
            </Card>
            <Card>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Salidas de Stock</p>
              <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">-{totalOutgoing.toFixed(2)}</p>
              <p className="mt-1 text-xs text-neutral-400">unidades consumidas / retiradas</p>
            </Card>
          </div>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">Facturas del Periodo</h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin facturas en este periodo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Proveedor</th>
                      <th className="pb-2 font-medium">Nº Factura</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 text-right font-medium">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2 text-neutral-600 dark:text-neutral-300">{formatDate(inv.invoice_date)}</td>
                        <td className="py-2 text-neutral-900 dark:text-neutral-100">{inv.supplier_name}</td>
                        <td className="py-2 text-neutral-600 dark:text-neutral-300">{inv.invoice_number}</td>
                        <td className="py-2">
                          <Badge tone={inv.payment_status === 'Pagada' ? 'green' : 'amber'}>{inv.payment_status}</Badge>
                        </td>
                        <td className="py-2 text-right font-medium text-neutral-900 dark:text-neutral-100">{formatCurrency(inv.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">Movimientos de Inventario</h2>
            {movements.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin movimientos en este periodo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Artículo</th>
                      <th className="pb-2 font-medium">Categoría</th>
                      <th className="pb-2 font-medium">Motivo</th>
                      <th className="pb-2 text-right font-medium">Cambio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 text-neutral-600 dark:text-neutral-300">{formatDateTime(m.created_at)}</td>
                        <td className="py-2 text-neutral-900 dark:text-neutral-100">{m.item_name}</td>
                        <td className="py-2">
                          <Badge>{m.item_category}</Badge>
                        </td>
                        <td className="py-2 text-neutral-600 dark:text-neutral-300">{m.reason}</td>
                        <td className={`py-2 text-right font-medium ${m.change_amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {m.change_amount >= 0 ? '+' : ''}
                          {m.change_amount} {m.item_unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
