import client from './client';

export const CATEGORIES = ['Bebidas', 'Carnes', 'Pesca', 'Limpieza', 'Verduras', 'Otros'];
export const UNITS = ['Kg', 'Litros', 'Unidades', 'Cajas'];

export const getInventory = () => client.get('/inventory').then((r) => r.data);
export const getInventoryItem = (id) => client.get(`/inventory/${id}`).then((r) => r.data);
export const createInventoryItem = (payload) => client.post('/inventory', payload).then((r) => r.data);
export const updateInventoryItem = (id, payload) => client.put(`/inventory/${id}`, payload).then((r) => r.data);
export const deleteInventoryItem = (id) => client.delete(`/inventory/${id}`);
export const adjustInventoryItem = (id, amount, reason) =>
  client.post(`/inventory/${id}/adjust`, { amount, reason }).then((r) => r.data);
export const getRecentMovements = (limit = 10) =>
  client.get('/inventory/movements', { params: { limit } }).then((r) => r.data);
export const getMovementsBetween = (start, end) =>
  client.get('/inventory/movements', { params: { start, end } }).then((r) => r.data);
