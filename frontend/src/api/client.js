import axios from 'axios';

// Same-origin '/api' by default (works with the Vite dev proxy and with the
// production same-origin static serving in backend/src/app.js). Only set
// VITE_API_URL if the frontend is deployed on a different origin than the API.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function friendlyMessage(err) {
  const status = err.response?.status;
  const serverMessage = err.response?.data?.error;
  if (serverMessage) return serverMessage;
  if (status === 502 || status === 503 || status === 504) {
    return 'El servidor no está disponible en este momento. Espera unos segundos e inténtalo de nuevo.';
  }
  if (!err.response) {
    return 'No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  }
  return err.message || 'Error de conexión con el servidor.';
}

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('admin_token')) {
      localStorage.removeItem('admin_token');
      window.dispatchEvent(new Event('admin-auth-expired'));
    }
    return Promise.reject(new Error(friendlyMessage(err)));
  }
);

export default client;
