const previousDir = process.cwd();
const argv = process.argv.slice(2);

const { exec, spawnSync } = require("child_process");
const fs = require("fs/promises");
const { constants: fsConstants } = require("fs");
const path = require("path");

process.chdir(__dirname);

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
  
  const dependencies = ["parse5", "csso", "htmlmin", "terser"];
  if (!moduleExists(dependencies)) {
    console.log("Dependencies not met, installing");
    let command = "yarn add";
    if (packageJson.dependencies) {
      let normalInstall = true;
      for (const dependency of dependencies) {
        if (!(dependency in packageJson.dependencies)) {
          normalInstall = false;
          command += " " + dependency;
        }
      }
      if (normalInstall) {
        command = "yarn install --production --frozen-lockfile --non-interactive";
      }
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
    process.exit(0);
  }

  const parse5 = require("parse5");
  const { minify: cssMinify } = require("csso");
  const htmlMinify = require("htmlmin");
  const { minify: jsMinify } = require("terser");
  console.log("Reading file");
  const documentContent = (await fs.readFile(filename)).toString();
  console.log("Parsing file");
  const document = parse5.parse(documentContent);

  let k = 0;
  /** @type {{ [name: string]: string; }} */
  const extracted = {};
  /**
   * @param {import('parse5').ChildNode} node 
   */
  function recurse(node) {
    if (node.nodeName === "script") {
      let data = "";
      if (node.childNodes[0]) {
        data = node.childNodes[0].value;
      } else {
        console.log("Something has gone wrong, script node has no child nodes (it should have a text node!)");
      }
      const src = (k++) + ".js";
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
      let data = "";
      if (node.childNodes[0]) {
        data = node.childNodes[0].value;
      } else {
        console.log("Something has gone wrong, style node has no child nodes (it should have a text node!)");
      }
      const src = (k++) + ".css";
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

  console.log("Modifying document");
  recurse(document);

  async function writeDocument() {
    console.log("Serializing document");
    const serialized = parse5.serialize(document);
    const serializedMinified = htmlMinify(serialized);
    console.log("Writing document");
    await fs.writeFile(filename, serializedMinified);
  }

  const promises = [ writeDocument() ];
  for (const [src, data] of Object.entries(extracted)) {
    promises.push((async () => {
      console.log(`Minifying ${src}`);
      let minifiedData;
      if (src.endsWith(".js")) {
        minifiedData = (await jsMinify(data, {
          compress: {
            arguments: true,
            drop_console: true,
            drop_debugger: true,
            keep_infinity: true,
            unsafe: true,
          },
          format: {
            comments: false,

          },
          toplevel: true,
          safari10: true,
        })).code;
      } else if (src.endsWith(".css")) {
        minifiedData = cssMinify(data, { comments: false }).css;
      } else {
        minifiedData = data;
      }
      console.log(`Writing ${src}`);
      fs.writeFile(path.join(path.dirname(filename), src), minifiedData);
    })());
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
    for (let i = 0; i < request.length; i++) {
      require.resolve(request[i]);
    }
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
