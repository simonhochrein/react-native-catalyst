#!/usr/bin/env node

const commander = require("commander");
const sanity_check = require("./sanity_check");
const logger = require("./logger");

commander
  .usage("<command> [options]")
  .option("--version", "Print CLI version")
  .option("--verbose", "Increase logging verbosity");

commander.version(require("./package.json").version);
logger.setVerbose(process.argv.includes("--verbose"));

commander
  .command("init")
  .description("Initialize project")
  .option("--no-prompt", "Skip prompt")
  .action((flags) => {
    sanity_check()
      .then((config) => {
        return require("./patch").run(config, flags.prompt);
      })
      .catch((e) => {
        logger.error(e.message);
      });
  });

commander
  .command("run")
  .description("Run project")
  .option("--release", "Release build", false)
  .action((flags) => {
    sanity_check()
      .then((config) => {
        return require("./run").run(config, flags.release);
      })
      .catch((e) => {
        logger.error(e.message);
      });
  });

commander.parse(process.argv);
