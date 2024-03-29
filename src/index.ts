// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import chalk from "chalk";
import { readFile } from "fs-extra";
import { coloredLog } from "logerian";
import minimist from "minimist";
import path from "path";
import { main } from "./entrypoints/main";
import { setup } from "./entrypoints/setup";
import { loadEnv } from "./util/Util";

function handleArgs(rawArgv: string[]) {
  const argv = minimist(rawArgv, {
    alias: {
      env: ["e"],
      help: ["h"],
      version: ["v"],
    },
    boolean: ["help", "version"],
    string: ["env"],
    default: {
      env: path.join(__dirname, "../.env"),
    },
    unknown: arg => !arg?.startsWith("--"),
  }) as minimist.ParsedArgs & {
    env: string;
    help: boolean;
    version: boolean;
  };

  const commands: Record<string, () => PromiseLike<void>> = {
    start: async () => {
      if (argv.help) {
        handleArgs(["help", "start"]);
        process.exit(0);
      }
      if (argv.version) {
        handleArgs(["--version"]);
        process.exit(0);
      }
      const envErrors = await loadEnv(argv.env);
      if (envErrors.length > 0) {
        for (let i = 0; i < envErrors.length; i++) {
          console.error(`${coloredLog("ERROR")} ${envErrors[i]}`);
        }
        console.error(`${coloredLog("FATAL")} Environment variable check failed.`);
        process.exit(1);
      }
      await main();
    },
    test: async () => {
      if (argv.help) {
        handleArgs(["help", "test", argv._[1]]);
        process.exit(0);
      }

      let failed = false;
      switch (argv._[1]) {
        case "env":
          // eslint-disable-next-line no-case-declarations
          const envErrors = await loadEnv(argv.env);
          if (envErrors.length > 0) {
            for (const error of envErrors) {
              console.error(coloredLog("ERROR") + error);
            }
            console.error(coloredLog("FATAL") + " Environment variables are incorrect.");
            process.exit(1);
          } else {
            console.log(`${coloredLog("INFO")} Environment variables are valid.`);
          }
          break;
        case undefined:
          console.error(`${coloredLog("FATAL")} No test specified.`);
          failed = true;
          break;
        default:
          console.error(`${coloredLog("FATAL")} Unknown test "${argv._[1]}".`);
          failed = true;
          break;
      }

      if (failed) {
        handleArgs(["help", "test"]);
      }
      process.exit(failed ? 1 : 0);
    },
    help: async () => {
      let failed = false;
      if (argv._.length <= 1 || argv._[1] === "help") {
        console.log(
          (
            "\n" +
            "Usage:\n" +
            chalk`\t{bold.yellow node} {bold.cyan ${process.argv[1]}} <command> [options]\n` +
            "\n" +
            "Commands:\n" +
            chalk`\t{bold.cyan start} - Starts the server\n` +
            chalk`\t{bold.cyan setup} <database url> - Setups the database\n` +
            chalk`\t{bold.cyan test} - Runs tests\n` +
            chalk`\t{bold.cyan help} - Prints this help message\n` +
            chalk`\t{bold.cyan help} [command|option] - Prints the help message for a specified command or option\n`
          )
            .split("\n")
            .map(line => `${coloredLog("INFO")}${line}`)
            .join("\n")
        );
      } else {
        switch (argv._[1]) {
          case "start":
            console.log(
              (
                "\n" +
                "Starts the server.\n" +
                "\n" +
                "Usage:\n" +
                chalk`\t{bold.yellow node} {bold.cyan ${process.argv[1]}} start [options]\n` +
                "\n" +
                "Options:\n" +
                chalk`\t{bold.cyan --env} - Path to the environment variable file, defaults to ".env" in the project folder\n` +
                chalk`\t{bold.cyan --help} - Prints this help message\n` +
                chalk`\t{bold.cyan --version} - Prints the version\n`
              )
                .split("\n")
                .map(line => `${coloredLog("INFO")}${line}`)
                .join("\n")
            );
            break;
          case "test":
            if (argv._.length > 2) {
              switch (argv._[2]) {
                case "env":
                  console.log(
                    (
                      "\n" +
                      "Tests the environment variables.\n" +
                      "\n" +
                      "Usage:\n" +
                      chalk`\t{bold.yellow node} {bold.cyan ${process.argv[1]}} test env [options]\n` +
                      "\n" +
                      "Options:\n" +
                      chalk`\t{bold.cyan --env} - Path to the environment variable file, defaults to ".env" in the project folder\n` +
                      chalk`\t{bold.cyan --help} - Prints this help message\n`
                    )
                      .split("\n")
                      .map(line => `${coloredLog("INFO")}${line}`)
                      .join("\n")
                  );
                  break;
                default:
                  console.error(`${coloredLog("FATAL")} Unknown test "${argv._[2]}".`);
                  handleArgs(["help", "test"]);
                  failed = true;
                  break;
              }
            } else {
              console.log(
                (
                  "\n" +
                  "Runs tests.\n" +
                  "\n" +
                  "Usage:\n" +
                  chalk`\t{bold.yellow node} {bold.cyan ${process.argv[1]}} test [options]\n` +
                  "\n" +
                  "Tests:\n" +
                  chalk`\t{bold.yellow env} - Tests the environment variables\n` +
                  "\n" +
                  "Options:\n" +
                  chalk`\t{bold.cyan --help} - Prints this help message or help for the test\n`
                )
                  .split("\n")
                  .map(line => `${coloredLog("INFO")}${line}`)
                  .join("\n")
              );
            }
            break;
          case "setup":
            console.log(
              (
                "\n" +
                "Sets up the database.\n" +
                "\n" +
                "Usage:\n" +
                chalk`\t{bold.yellow node} {bold.cyan ${process.argv[1]}} setup <database url> [options]\n` +
                "\n" +
                "Options:\n" +
                chalk`\t{bold.cyan --help} - Prints this help message\n`
              )
                .split("\n")
                .map(line => `${coloredLog("INFO")}${line}`)
                .join("\n")
            );
            break;
        }
      }

      if (failed) process.exit(1);
      return;
    },
    setup: async () => {
      if (argv.help) {
        handleArgs(["help", "setup"]);
        process.exit(0);
      }

      if (argv._.length <= 1) {
        console.error(`${coloredLog("FATAL")} No database url specified.`);
        handleArgs(["help", "setup"]);
        process.exit(1);
      }

      if (!argv._[1].startsWith("postgres://")) {
        console.error(`${coloredLog("FATAL")} Invalid database url.`);
        handleArgs(["help", "setup"]);
        process.exit(1);
      }

      setup(argv._[1]);
    },
  };

  if (argv._.length === 0) {
    if (argv.version) {
      readFile(path.join(__dirname, "../package.json"))
        .then(data => {
          try {
            const packageJson = JSON.parse(data.toString());
            console.log(`${coloredLog("INFO")} ${packageJson.name ?? "infernalstudios.org"} v${packageJson.version}`);
            process.exit(0);
          } catch {
            console.error(`${coloredLog("FATAL")} Could not parse package.json`);
            process.exit(1);
          }
        })
        .catch(error => {
          console.error(`${coloredLog("FATAL")} Could not read package.json`);
          console.error(error);
          process.exit(1);
        });
    } else if (argv.help) {
      commands.help();
    } else {
      console.error(`${coloredLog("FATAL")} No command specified.`);
      commands.help().then(() => process.exit(1));
    }
  } else if (argv._[0] in commands) {
    commands[argv._[0]]();
  } else {
    console.error(`${coloredLog("FATAL")} Unknown command "${argv._[0]}".`);
    commands.help();
    process.exit(1);
  }
}

handleArgs(process.argv.slice(2));
