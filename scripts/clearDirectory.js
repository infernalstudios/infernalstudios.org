const fs = require("fs/promises");
const path = require("path");

void async function main() {
  for (const file of await fs.readdir(process.argv[2])) {
    void async function removeFile() {
      const filename = path.join(process.argv[2], file);
      if ((await fs.stat(filename)).isDirectory()) {
        fs.rm(filename, { recursive: true });
      } else {
        fs.unlink(filename);
      }
    }();
  }
}();
