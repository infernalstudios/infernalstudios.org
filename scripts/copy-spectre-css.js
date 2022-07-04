const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
fs.existsSync = require('fs').existsSync;

const copyPath = "public/css"

/**
 * Generates SHA256 hash from data.
 * @param {string | Buffer | TypedArray | DataView} data Data to generate hash from
 * @param {string} encoding https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings
 * @returns {string}
 */
function sha256(data, encoding = 'hex') {
  return crypto.createHash('sha256')
    .update(data)
    .digest(encoding);
}

void async function main() {
  const dir = path.join(require.resolve('spectre.css'), '..');
  if (!fs.existsSync(`${copyPath}/`)) {
    console.log("\x1B[32m'${copyPath}'\x1B[39m directory doesn't exist, creating...")
    await fs.mkdir(path.normalize(copyPath), { recursive: true });
  }

  if (
    !fs.existsSync(path.join(copyPath, 'spectre.min.css')) ||
    sha256(await fs.readFile(path.join(dir, 'spectre.min.css'))) !== sha256(await fs.readFile(path.join(copyPath, 'spectre.min.css')))
  ) {
    fs.copyFile(path.join(dir, 'spectre.min.css'), path.join(copyPath, 'spectre.min.css'))
      .then(() => console.log(`Copied \x1B[32m'spectre.min.css'\x1B[39m into /${copyPath}/`));
  }
  if (
    !fs.existsSync(path.join(copyPath, 'spectre-exp.min.css')) ||
    sha256(await fs.readFile(path.join(dir, 'spectre-exp.min.css'))) !== sha256(await fs.readFile(path.join(copyPath, 'spectre-exp.min.css')))
  ) {
    fs.copyFile(path.join(dir, 'spectre-exp.min.css'), path.join(copyPath, 'spectre-exp.min.css'))
      .then(() => console.log(`Copied \x1B[32m'spectre-exp.min.css'\x1B[39m into /${copyPath}/`));
  }
  if (
    !fs.existsSync(path.join(copyPath, 'spectre-icons.min.css')) ||
    sha256(await fs.readFile(path.join(dir, 'spectre-icons.min.css'))) !== sha256(await fs.readFile(path.join(copyPath, 'spectre-icons.min.css')))
  ) {
    fs.copyFile(path.join(dir, 'spectre-icons.min.css'), path.join(copyPath, 'spectre-icons.min.css'))
      .then(() => console.log(`Copied \x1B[32m'spectre-icons.min.css'\x1B[39m into /${copyPath}/`));
  }
}();