import client from './client';

export const adminLogin = (pin) => client.post('/auth/admin/login', { pin }).then((r) => r.data);
export const changeAdminPin = (currentPin, newPin) =>
  client.post('/auth/admin/change-pin', { currentPin, newPin }).then((r) => r.data);
