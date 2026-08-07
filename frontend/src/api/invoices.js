import client from './client';

export const getInvoices = (params) => client.get('/invoices', { params }).then((r) => r.data);
export const getInvoicesBySupplier = () => client.get('/invoices/by-supplier').then((r) => r.data);
export const getInvoice = (id) => client.get(`/invoices/${id}`).then((r) => r.data);
export const createInvoice = (payload) => client.post('/invoices', payload).then((r) => r.data);
export const updateInvoiceStatus = (id, payment_status) =>
  client.patch(`/invoices/${id}/status`, { payment_status }).then((r) => r.data);
export const deleteInvoice = (id) => client.delete(`/invoices/${id}`);

export const parseInvoicePdf = (file) => {
  const formData = new FormData();
  formData.append('invoice', file);
  return client
    .post('/invoices/parse-pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
};
