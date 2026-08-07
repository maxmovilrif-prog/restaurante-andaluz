import { useEffect, useState } from 'react';
import { Wallet, ReceiptEuro, AlertTriangle, History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getDashboardSummary } from '../api/dashboard';
import { Card, Badge } from '../components/ui';
import { formatCurrency, formatDateTime } from '../utils/format';

function SummaryCard({ icon: Icon, label, value, tone, hint }) {
  const tones = {
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  };
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
        {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={20} />
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getDashboardSummary()
      .then((data) => mounted && setSummary(data))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <p className="text-neutral-500 dark:text-neutral-400">Cargando panel…</p>;
  }
  if (error) {
    return <p className="text-red-600 dark:text-red-400">Error: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Panel de Control</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Resumen general de Restaurante Andaluz</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Wallet} tone="orange" label="Valor Total del Stock" value={formatCurrency(summary.totalStockValue)} />
        <SummaryCard icon={ReceiptEuro} tone="blue" label="Gasto en Facturas (mes)" value={formatCurrency(summary.monthlyExpense)} />
        <SummaryCard
          icon={AlertTriangle}
          tone="red"
          label="Artículos con Stock Bajo"
          value={summary.lowStockCount}
          hint={summary.lowStockCount > 0 ? 'Requieren reposición' : 'Todo en orden'}
        />
        <SummaryCard icon={History} tone="green" label="Movimientos Recientes" value={summary.recentMovements.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Alertas de Stock Bajo</h2>
            {summary.lowStockItems.length > 0 && <Badge tone="red">{summary.lowStockItems.length} alertas</Badge>}
          </div>
          {summary.lowStockItems.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay artículos con stock bajo.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {summary.lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {item.quantity} / {item.min_threshold} {item.unit}
                    </p>
                    <p className="text-xs text-neutral-400">mínimo</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Transacciones Recientes</h2>
          </div>
          {summary.recentMovements.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin movimientos todavía.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {summary.recentMovements.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        m.change_amount >= 0
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                      }`}
                    >
                      {m.change_amount >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{m.item_name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{m.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${m.change_amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {m.change_amount >= 0 ? '+' : ''}
                      {m.change_amount} {m.item_unit}
                    </p>
                    <p className="text-xs text-neutral-400">{formatDateTime(m.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">Últimas Facturas</h2>
        {summary.recentInvoices.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin facturas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="pb-2 font-medium">Proveedor</th>
                  <th className="pb-2 font-medium">Nº Factura</th>
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 pr-0 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {summary.recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2.5 text-neutral-900 dark:text-neutral-100">{inv.supplier_name}</td>
                    <td className="py-2.5 text-neutral-600 dark:text-neutral-300">{inv.invoice_number}</td>
                    <td className="py-2.5 text-neutral-600 dark:text-neutral-300">{inv.invoice_date}</td>
                    <td className="py-2.5">
                      <Badge tone={inv.payment_status === 'Pagada' ? 'green' : 'amber'}>{inv.payment_status}</Badge>
                    </td>
                    <td className="py-2.5 text-right font-medium text-neutral-900 dark:text-neutral-100">{formatCurrency(inv.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
