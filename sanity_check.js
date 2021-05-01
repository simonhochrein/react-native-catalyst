const ora = require("ora");
const { promises } = require("fs");
const { setVerbose, debug, warn, info, success } = require("./logger");
const { join } = require("path");

module.exports = async () => {
  try {
    await promises.stat(join(process.cwd(), "package.json"));
    await promises.stat(join(process.cwd(), "ios"));
    const config = JSON.parse(
      await promises.readFile(join(process.cwd(), "package.json"), "utf8")
    );
    await promises.stat(join(process.cwd(), "ios", config.name + ".xcodeproj"));
    await promises.stat(
      join(process.cwd(), "ios", config.name + ".xcworkspace")
    );
    await promises.stat(join(process.cwd(), "ios", "Podfile"));
    return config;
  } catch (e) {
    debug(e.message);
    throw new Error("Not a React Native project");
  }
};
