import client from './client';

export const getConsumableItems = () => client.get('/staff/items').then((r) => r.data);
export const submitConsumption = (pin, items) => client.post('/staff/consume', { pin, items }).then((r) => r.data);
