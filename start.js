// Repo-root launcher for `npm start`. Render's "Root Directory" setting has proven
// inconsistent across deploys — the working directory for the Start Command has
// sometimes been the repo root, sometimes backend/ — so this checks both instead
// of hardcoding one relative path that only works for one of them.
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(process.cwd(), 'backend', 'src', 'server.js'), // cwd = repo root
  path.join(process.cwd(), 'src', 'server.js'), // cwd = backend/
];

const entry = candidates.find((p) => fs.existsSync(p));
if (!entry) {
  throw new Error(`No se encontró server.js. Rutas probadas:\n${candidates.join('\n')}`);
}

require(entry);
