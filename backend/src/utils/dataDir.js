const path = require('node:path');
const fs = require('node:fs');

// Deliberately __dirname-based, not process.cwd(): cwd varies depending on how
// the process is launched (e.g. `npm run dev --prefix backend` from the repo
// root leaves cwd at the repo root, not backend/), which would scatter the .db
// file outside backend/data — the only path .gitignore actually excludes.
const localDataDir = path.join(__dirname, '..', '..', 'data');

// Override with DATA_DIR when a persistent disk is mounted elsewhere — e.g. a
// Render/Railway volume at /var/data. Falls back to the local ./data folder
// (and stays there) if DATA_DIR is unset or unusable — no disk attached, no
// permission to create it, etc. — so the app still boots instead of crashing
// on mkdir (its data just won't survive a redeploy without a real disk).
function getDataDir() {
  const preferred = process.env.DATA_DIR || localDataDir;

  try {
    fs.mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch (err) {
    if (preferred === localDataDir) throw err;
    console.error(
      `No se pudo usar DATA_DIR="${preferred}" (${err.code}: ${err.message}). ` +
        `Usando "${localDataDir}" en su lugar — sin disco persistente, estos datos no sobrevivirán a un redeploy.`
    );
    fs.mkdirSync(localDataDir, { recursive: true });
    return localDataDir;
  }
}

module.exports = getDataDir;
