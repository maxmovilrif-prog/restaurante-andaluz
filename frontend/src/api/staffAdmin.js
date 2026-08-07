import client from './client';

export const getStaff = () => client.get('/admin/staff').then((r) => r.data);
export const createStaff = (payload) => client.post('/admin/staff', payload).then((r) => r.data);
export const updateStaff = (id, payload) => client.put(`/admin/staff/${id}`, payload).then((r) => r.data);
export const deleteStaff = (id) => client.delete(`/admin/staff/${id}`);
export const getConsumptionLog = (params) => client.get('/admin/staff/consumptions/log', { params }).then((r) => r.data);
