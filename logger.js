const chalk = require("chalk");

module.exports = {
  verbose: false,
  setVerbose(on) {
    this.verbose = on;
  },
  debug(message) {
    if (this.verbose) {
      console.log(`${chalk.gray.bold("debug")} ${chalk.reset(message)}`);
    }
  },
  error(message) {
    console.error(`${chalk.red.bold("error")} ${chalk.reset(message)}`);
  },
  warn(message) {
    console.warn(`${chalk.yellow.bold("warn")} ${chalk.reset(message)}`);
  },
  info(message) {
    console.log(`${chalk.cyan.bold("info")} ${chalk.reset(message)}`);
  },
  success(message) {
    console.log(`${chalk.green.bold("success")} ${chalk.reset(message)}`);
  },
};
