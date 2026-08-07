const path = require('node:path');

// Override with DATA_DIR when the persistent disk isn't at the default local
// path — e.g. a Render/Railway persistent volume mounted at /var/data.
function getDataDir() {
  return process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
}

module.exports = getDataDir;
