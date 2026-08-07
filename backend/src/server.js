require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

// Last-resort safety net: a bug in any request handler should return a 500 to that
// one request, never take down the whole process. The real fix is proper try/catch
// (see asyncHandler.js and invoiceParse.controller.js) — this just prevents a
// regression from crashing the server again.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (server kept running):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server kept running):', err);
});

app.listen(PORT, () => {
  console.log(`Restaurante Andaluz API escuchando en http://localhost:${PORT}`);
});
