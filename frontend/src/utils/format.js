export function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return '';
  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return datePart;
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
