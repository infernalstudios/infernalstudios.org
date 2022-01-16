const previousDir = process.cwd();
const argv = process.argv.slice(2);

const { exec, spawnSync } = require("child_process");
const fs = require("fs/promises");
const { constants: fsConstants } = require("fs");
const path = require("path");
const { createHash } = require("crypto");

process.chdir(path.resolve(module.path));

void async function main() {
  if (require.main !== module) return;

  let filename = argv[0];
  if (!filename) {
    console.error(`Usage: node ${path.relative(path.resolve(previousDir), path.resolve(process.cwd()))} <filename>`);
  }
  filename = path.join(previousDir, filename);

  if (!await exists(filename)) {
    console.error(`File ${filename} doesn't exist`);
    process.exit(1);
  } else if (!await accessBool(filename, fsConstants.R_OK)) {
    console.error(`File ${filename} is not readable!`);
    process.exit(1);
  } else if (!await accessBool(filename, fsConstants.W_OK)) {
    console.error(`File ${filename} is not writable!`);
    process.exit(1);
  }
  
  if (!await exists("package.json")) {
    console.error("No package.json found!");
    process.exit(1);
  }
  const packageJson = JSON.parse(await fs.readFile("package.json"));
  
  if (!moduleExists("parse5")) {
    console.log("Dependencies not met, installing...");
    let command;
    if (!packageJson.dependencies?.parse5) {
      command = "yarn add parse5";
    } else {
      command = "yarn install --production --frozen-lockfile --non-interactive";
    }
    console.log(`\x1b[90m$ ${command}\x1b[39m`);
    const [installProcess, installProcessPromise] = promisifyExec(command, {});
    installProcess.stdout.on("data", data => process.stdout.write(data));
    installProcess.stderr.on("data", data => process.stderr.write(data));

    try {
      await installProcessPromise;
    } catch (err) {
      console.error(err);
    }

    console.log("Installed required dependencies, restarting script");
    console.log(`\x1b[90m$ ${process.argv.join(" ")}\x1b[39m`);

    spawnSync(process.argv[0], [...process.argv.slice(1)], { stdio: "inherit", cwd: previousDir });
  }

  const parse5 = require("parse5");
  console.log("Reading file...");
  const documentContent = (await fs.readFile(filename)).toString();
  console.log("Parsing file...");
  const document = parse5.parse(documentContent);

  /** @type {{ [name: string]: string; }} */
  const extracted = {};
  /**
   * @param {import('parse5').ChildNode} node 
   */
  function recurse(node) {
    if (node.nodeName === "script") {
      let data = node.childNodes[0].value;
      // data = data.replace(`,s.createElement(Xv,null,s.createElement("a",{target:"_blank",rel:"noopener noreferrer",href:"https://github.com/Redocly/redoc"},"Documentation Powered by ReDoc")`, "");
      const src = getSHA256(data) + ".js";
      extracted[src] = data;
      const oldAttrs = node.attrs;
      node.attrs = [];
      node.childNodes = [];
      let type = "text/javascript";
      for (const attr of oldAttrs) {
        if (attr.name !== "src") {
          if (attr.name === "type") {
            type = attr.value;
          } else {
            node.attrs.push(attr);
          }
        }
      }
      node.attrs.push(
        {
          name: "src",
          value: "./" + src
        },
        {
          name: "type",
          value: type
        }
      );
    } else if (node.nodeName === "style") {
      const data = node.childNodes[0].value;
      const src = getSHA256(data) + ".css";
      extracted[src] = data;
      const oldAttrs = node.attrs;
      node.nodeName = "link";
      node.tagName = "link";
      node.attrs = [
        {
          name: "rel",
          value: "stylesheet"
        },
        {
          name: "href",
          value: "./" + src
        }
      ];
      if (oldAttrs.some(attr => attr.name === "media")) {
        node.attrs.push(
          {
            name: "media",
            value: oldAttrs.find(attr => attr.name === "media").value
          }
        );
      }
      node.childNodes = [];
    } else if (node.nodeName === "#comment" || nodeHasClass(node, "sc-XxNYO")) {
      node.parentNode.childNodes = node.parentNode.childNodes.filter(child => child !== node);
    } else if (node.childNodes) {
      for (const child of node.childNodes) {
        recurse(child);
      }
    }
  }

  console.log("Modifying document...");
  recurse(document);

  console.log("Injecting custom code...");
  const script = parse5.parse(`
    <script>
      document.addEventListener("DOMContentLoaded", () => {
        const observer = new MutationObserver(mutations => {
          outerLoop: for (const mutation of mutations) {
            if (mutation.type === "childList") {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.children[0]?.innerHTML === "Documentation Powered by ReDoc") {
                  node.parentNode.removeChild(node);
                  observer.disconnect();
                  break outerLoop;
                }
              }
            }
          }
        });
        observer.observe(document, { childList: true, subtree: true });
      });
    </script>
  `).childNodes[0].childNodes[0].childNodes[0];
  document.childNodes[1].childNodes[0].childNodes.push(script);
  script.parentNode = document.childNodes[1].childNodes[0];

  document.childNodes.push(script);

  async function writeDocument() {
    console.log("Serializing document...");
    const serialized = parse5.serialize(document);
    console.log("Writing document...");
    await fs.writeFile(filename, serialized);
  }

  const promises = [ writeDocument() ];
  for (const [src, data] of Object.entries(extracted)) {
    console.log(`Writing to ${src}...`);
    promises.push(fs.writeFile(path.join(path.dirname(filename), src), data));
  }

  await Promise.all(promises);
}();

/**
 * @param {import('parse5').ChildNode} node 
 * @param {string} className 
 * @returns {boolean}
 */
function nodeHasClass(node, className) {
  if (!node.attrs) return false;
  return node.attrs.some(attr => attr.name === "class" && attr.value.split(" ").includes(className));
}

function moduleExists(request) {
  try {
    require.resolve(request);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * @param {string} execString
 * @param {(import('fs').ObjectEncodingOptions & import('child_process').ExecOptions)} options
 * @returns {[import('child_process').ChildProcess, Promise<void>]}
 */
function promisifyExec(execString, options) {
  let status = 0;
  let error = null;
  let updateStatus = (code, err) => {
    status = code;
    error = err;
  }

  const promise = new Promise((resolve, reject) => {
    if (status === 0) {
      updateStatus = (code, err) => {
        if (code === 1) {
          resolve();
          return;
        } else if (code === -1) {
          reject(err);
          return;
        }
      }
    } else {
      if (code === 1) {
        resolve();
        return;
      } else if (code === -1) {
        reject(error);
        return;
      }
    }
  });


  const childProcess = exec(execString, options, err => {
    if (err) {
      updateStatus(-1, err);
    } else {
      updateStatus(1);
    }
  });

  return [childProcess, promise];
}

/**
 * @param {string} filename
 * @returns Promise<boolean>
 */
async function exists(filename) {
  return await accessBool(filename, fsConstants.F_OK);
}

/**
 * @param {string} filename
 * @param {number} mode
 * @returns Promise<boolean>
 */
async function accessBool(filename, mode) {
  try {
    await fs.access(filename, mode);
    return true;
  } catch (e) {
    return false;
  }
}

function getSHA256(data) {
  return createHash("sha256").update(data).digest("hex");
}
