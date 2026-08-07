import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Minus, Plus, ShoppingBasket, CheckCircle2, UtensilsCrossed } from 'lucide-react';
import { getConsumableItems, submitConsumption } from '../api/staffConsumption';
import { CATEGORIES } from '../api/inventory';
import { Button } from '../components/ui';
import Modal from '../components/Modal';
import PinPad from '../components/PinPad';

export default function StaffConsumption() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [cart, setCart] = useState({});

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  function load() {
    setLoading(true);
    getConsumableItems()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = categoryFilter === 'Todas' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const cartLines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ item: items.find((i) => String(i.id) === id), quantity: qty }))
    .filter((line) => line.item);
  const cartCount = cartLines.length;

  function changeQty(item, delta) {
    setCart((prev) => {
      const current = prev[item.id] || 0;
      const step = item.unit === 'Kg' || item.unit === 'Litros' ? 0.5 : 1;
      const next = Math.max(0, Math.round((current + delta * step) * 100) / 100);
      return { ...prev, [item.id]: next };
    });
  }

  async function handlePinSubmit(pin) {
    setSubmitting(true);
    setPinError('');
    try {
      const payload = cartLines.map((line) => ({ stock_item_id: line.item.id, quantity: line.quantity }));
      const result = await submitConsumption(pin, payload);
      setConfirmation(result);
      setCart({});
      setPinModalOpen(false);
      load();
    } catch (err) {
      setPinError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 dark:bg-neutral-950">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
            <ArrowLeft size={16} /> Inicio
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white">
              <UtensilsCrossed size={16} />
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Consumo Interno</p>
          </div>
          <div className="w-14" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar artículo..."
            className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['Todas', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-orange-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">Cargando artículos…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                    qty > 0
                      ? 'border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30'
                      : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Disponible: {item.quantity} {item.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(item, -1)}
                      disabled={qty <= 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-100">{qty}</span>
                    <button
                      onClick={() => changeQty(item, 1)}
                      disabled={qty >= item.quantity}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 disabled:opacity-30 dark:bg-orange-950 dark:text-orange-300"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <ShoppingBasket size={18} />
              {cartCount} artículo{cartCount > 1 ? 's' : ''} seleccionado{cartCount > 1 ? 's' : ''}
            </div>
            <Button onClick={() => setPinModalOpen(true)}>Confirmar consumo</Button>
          </div>
        </div>
      )}

      <Modal
        open={pinModalOpen}
        title="Confirma tu PIN"
        onClose={() => {
          setPinModalOpen(false);
          setPinError('');
        }}
      >
        <div className="py-2">
          <p className="mb-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Introduce tu PIN de 4 dígitos para registrar el consumo.
          </p>
          <PinPad onSubmit={handlePinSubmit} disabled={submitting} error={pinError} />
        </div>
      </Modal>

      <Modal open={!!confirmation} title="Consumo registrado" onClose={() => setConfirmation(null)}>
        {confirmation && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
              <p className="text-sm font-medium">Registrado a nombre de {confirmation.staff_name}</p>
            </div>
            <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
              {confirmation.items.map((line) => (
                <li key={line.id} className="flex justify-between">
                  <span>{line.item_name}</span>
                  <span>
                    {line.quantity} {line.unit}
                  </span>
                </li>
              ))}
            </ul>
            <Button onClick={() => setConfirmation(null)} className="w-full justify-center">
              Cerrar
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
