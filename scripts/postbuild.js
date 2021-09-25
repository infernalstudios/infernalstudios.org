const fs = require("fs-extra");
const path = require("path");

function log(...data) {
    console.log("[Postbuild Script]", ...data);
}

async function main() {
    let publicFiles = await getFilesRecursively("src/public");
    publicFiles = publicFiles.filter(file => !file.endsWith(".ts")); // Filter out typescript files.
    /** @type {Promise<any>[]} */
    const promises = [];
    for (file of publicFiles) {
        const src = file;
        const dest = file.replace("src/public", "dist/public");
        const promise = fs.copyFile(src, dest);
        promise.then(() => {
            log(`Copied ${src} to ${dest}`);
        });
        promises.push(promise);
    }
    await Promise.all(promises);
    log("Copied all files!");
}

main();

/**
 * Gets all files in directory recursively.
 * @param {string} directory Path to directory
 * @returns {Promise<string[]>} Array of paths to files (doesn't include directories)
 */
async function getFilesRecursively(directory) {
    const result = [];
    for (let file of await fs.readdir(directory)) {
        file = path.join(directory, file);
        if ((await fs.lstat(file)).isDirectory()) {
            result.push(...(await getFilesRecursively(file)));
        } else {
            result.push(file);
        }
    }
    return result;
}
