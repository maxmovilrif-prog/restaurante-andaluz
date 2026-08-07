import client from './client';

function filenameFromDisposition(disposition, fallback) {
  const match = disposition && disposition.match(/filename="?([^";]+)"?/);
  return match ? match[1] : fallback;
}

export async function downloadReport(path, params, fallbackName) {
  const response = await client.get(path, { params, responseType: 'blob' });
  const filename = filenameFromDisposition(response.headers['content-disposition'], fallbackName);
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
