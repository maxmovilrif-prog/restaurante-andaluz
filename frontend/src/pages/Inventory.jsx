import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, PlusCircle, MinusCircle } from 'lucide-react';
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryItem,
  CATEGORIES,
  UNITS,
} from '../api/inventory';
import { Card, Badge, Button, Input, Select } from '../components/ui';
import Modal from '../components/Modal';
import { formatCurrency } from '../utils/format';

const EMPTY_FORM = { name: '', category: CATEGORIES[0], quantity: '', unit: UNITS[0], min_threshold: '', cost_price: '' };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [adjustingId, setAdjustingId] = useState(null);

  function load() {
    setLoading(true);
    getInventory()
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

  function openCreate() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      min_threshold: item.min_threshold,
      cost_price: item.cost_price,
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return setFormError('El nombre es obligatorio.');
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      min_threshold: Number(form.min_threshold) || 0,
      cost_price: Number(form.cost_price) || 0,
    };
    try {
      if (editingItem) {
        const updated = await updateInventoryItem(editingItem.id, payload);
        setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      } else {
        const created = await createInventoryItem(payload);
        setItems((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteInventoryItem(deleteTarget.id);
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleQuickAdjust(item, delta) {
    setAdjustingId(item.id);
    try {
      const updated = await adjustInventoryItem(item.id, delta, delta > 0 ? 'Ajuste manual (+)' : 'Ajuste manual (-)');
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    } catch (err) {
      setError(err.message);
    } finally {
      setAdjustingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Gestión de Stock</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{items.length} artículos en inventario</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nuevo Artículo
        </Button>
      </div>

      <Card className="!p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artículo..."
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
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
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-neutral-500 dark:text-neutral-400">Cargando inventario…</p>
        ) : error ? (
          <p className="p-5 text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-neutral-500 dark:text-neutral-400">No se encontraron artículos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                  <th className="px-5 py-3 font-medium">Artículo</th>
                  <th className="px-5 py-3 font-medium">Categoría</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium">Mínimo</th>
                  <th className="px-5 py-3 font-medium">Precio Coste</th>
                  <th className="px-5 py-3 font-medium">Ajuste Rápido</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((item) => {
                  const isLow = item.quantity <= item.min_threshold;
                  return (
                    <tr key={item.id} className={isLow ? 'bg-red-50/60 dark:bg-red-950/20' : ''}>
                      <td className="px-5 py-3 font-medium text-neutral-900 dark:text-neutral-100">{item.name}</td>
                      <td className="px-5 py-3">
                        <Badge>{item.category}</Badge>
                      </td>
                      <td className={`px-5 py-3 font-semibold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                        {item.quantity} {item.unit}
                        {isLow && (
                          <span className="ml-2">
                            <Badge tone="red">Bajo</Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-neutral-500 dark:text-neutral-400">
                        {item.min_threshold} {item.unit}
                      </td>
                      <td className="px-5 py-3 text-neutral-500 dark:text-neutral-400">{formatCurrency(item.cost_price)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={adjustingId === item.id}
                            onClick={() => handleQuickAdjust(item, -1)}
                            className="text-red-500 hover:text-red-700 disabled:opacity-40 dark:text-red-400"
                            title="Restar 1"
                          >
                            <MinusCircle size={20} />
                          </button>
                          <button
                            disabled={adjustingId === item.id}
                            onClick={() => handleQuickAdjust(item, 1)}
                            className="text-emerald-500 hover:text-emerald-700 disabled:opacity-40 dark:text-emerald-400"
                            title="Sumar 1"
                          >
                            <PlusCircle size={20} />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(item)} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => setDeleteTarget(item)} className="rounded-md p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{formError}</p>}
          <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="p.ej. Café en grano" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select label="Unidad" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Cantidad"
              type="number"
              step="0.01"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <Input
              label="Umbral Mínimo"
              type="number"
              step="0.01"
              min="0"
              value={form.min_threshold}
              onChange={(e) => setForm({ ...form, min_threshold: e.target.value })}
            />
            <Input
              label="Precio Coste (€)"
              type="number"
              step="0.01"
              min="0"
              value={form.cost_price}
              onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Eliminar Artículo"
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
          ¿Seguro que quieres eliminar <strong>{deleteTarget?.name}</strong> del inventario? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
