// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

child_process.spawnSync("git", ["apply", "-v", ...getPatches()], { stdio: [null, "inherit", null] });

function getPatches() {
  return fs
    .readdirSync(path.join(__dirname, "../patches"))
    .filter(file => file.endsWith(".patch"))
    .map(file => path.join(__dirname, "../patches", file));
}
