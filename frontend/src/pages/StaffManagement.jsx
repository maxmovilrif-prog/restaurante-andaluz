import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { getStaff, createStaff, updateStaff, deleteStaff, getConsumptionLog } from '../api/staffAdmin';
import { Card, Badge, Button, Input } from '../components/ui';
import Modal from '../components/Modal';
import { formatCurrency, formatDateTime } from '../utils/format';

const EMPTY_FORM = { name: '', pin: '' };

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([getStaff(), getConsumptionLog()])
      .then(([s, l]) => {
        setStaff(s);
        setLog(l);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingStaff(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(member) {
    setEditingStaff(member);
    setForm({ name: member.name, pin: '' });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return setFormError('El nombre es obligatorio.');
    if (!editingStaff && !/^\d{4}$/.test(form.pin)) return setFormError('El PIN debe tener exactamente 4 dígitos.');
    if (editingStaff && form.pin && !/^\d{4}$/.test(form.pin)) return setFormError('El PIN debe tener exactamente 4 dígitos.');

    setSaving(true);
    try {
      if (editingStaff) {
        const payload = { name: form.name.trim() };
        if (form.pin) payload.pin = form.pin;
        const updated = await updateStaff(editingStaff.id, payload);
        setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createStaff({ name: form.name.trim(), pin: form.pin });
        setStaff((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member) {
    try {
      const updated = await updateStaff(member.id, { active: !member.active });
      setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteStaff(deleteTarget.id);
      setStaff((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const monthlyTotal = log.reduce((sum, l) => sum + l.total_cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Personal</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Gestión de empleados y consumos internos</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nuevo Empleado
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>}

      <Card>
        <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">Empleados</h2>
        {loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Cargando…</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay empleados registrados.</p>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{member.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Desde {formatDateTime(member.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={member.active ? 'green' : 'neutral'}>{member.active ? 'Activo' : 'Inactivo'}</Badge>
                  <button
                    onClick={() => toggleActive(member)}
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                    title={member.active ? 'Desactivar' : 'Activar'}
                  >
                    {member.active ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                  <button onClick={() => openEdit(member)} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeleteTarget(member)} className="rounded-md p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Registro de Consumos Internos</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Total: {formatCurrency(monthlyTotal)}</p>
        </div>
        {log.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin consumos registrados todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Empleado</th>
                  <th className="pb-2 font-medium">Artículo</th>
                  <th className="pb-2 font-medium">Cantidad</th>
                  <th className="pb-2 text-right font-medium">Coste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {log.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2 text-neutral-600 dark:text-neutral-300">{formatDateTime(entry.created_at)}</td>
                    <td className="py-2 text-neutral-900 dark:text-neutral-100">{entry.staff_name}</td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-300">{entry.item_name}</td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-300">
                      {entry.quantity} {entry.unit}
                    </td>
                    <td className="py-2 text-right font-medium text-neutral-900 dark:text-neutral-100">{formatCurrency(entry.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editingStaff ? 'Editar Empleado' : 'Nuevo Empleado'}
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
          <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="p.ej. Ana García" />
          <Input
            label={editingStaff ? 'Nuevo PIN (opcional)' : 'PIN (4 dígitos)'}
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="1234"
          />
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Eliminar Empleado"
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
          ¿Seguro que quieres eliminar a <strong>{deleteTarget?.name}</strong>? El historial de consumos se conservará.
        </p>
      </Modal>
    </div>
  );
}
