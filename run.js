const execa = require("execa");
const ora = require("ora");
const { join } = require("path");
const logger = require("./logger");

module.exports.run = async (config, release) => {
  const buildingSpinner = ora().start("Building");
  const iosPath = join(process.cwd(), "ios");
  const workspacePath = join(iosPath, config.name + ".xcworkspace");
  const configuration = release ? "Release" : "Debug";
  try {
    await build(config, workspacePath, configuration, buildingSpinner);
  } catch (e) {
    buildingSpinner.clear();
    logger.error(e);
    buildingSpinner.fail("Build Failed");
    return;
  }
  buildingSpinner.succeed("Build Finished");

  const runningSpinner = ora().start("Running");

  try {
    const output = await execa(`xcodebuild`, [
      `-showBuildSettings`,
      `-workspace`,
      workspacePath,
      `-destination`,
      `platform=macOS,variant=Mac Catalyst`,
      `-scheme`,
      config.name,
      `-configuration`,
      configuration,
    ]);
    if (logger.verbose) {
      runningSpinner.clear();
      logger.debug(output.command);
    }

    const build_dir = /BUILT_PRODUCTS_DIR\s=\s(.*)/
      .exec(output.stdout)[1]
      .replace("iphoneos", "maccatalyst");

    const app = join(
      build_dir,
      config.name + ".app",
      "Contents",
      "MacOS",
      config.name
    );

    const p = execa(app);
    runningSpinner.succeed("Running");
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stdout);
    p.on("exit", (code) => {
      logger.info(`Program exited with code ${code}`);
    });
  } catch (e) {
    runningSpinner.clear();
    logger.error(e);
    runningSpinner.fail("Failed to start");
    return;
  }
};

const build = (config, workspacePath, configuration, spinner) => {
  return new Promise((resolve, reject) => {
    const cp = execa(
      `xcodebuild`,
      [
        `-workspace`,
        workspacePath,
        `-destination`,
        `platform=macOS,variant=Mac Catalyst`,
        `-scheme`,
        config.name,
        `-configuration`,
        configuration,
        `CODE_SIGN_IDENTITY=-`,
        configuration == "Debug" ? `SKIP_BUNDLING=true` : `SKIP_BUNDLING=false`,
      ],
      { cwd: process.cwd(), all: true }
    );
    cp.stdout.on("data", (data) => {
      if (logger.verbose) {
        spinner.clear();
        logger.debug(data.toString());
      }
    });
    cp.stderr.on("data", (data) => {
      spinner.clear();
      logger.error(data.toString());
    });

    cp.on("exit", (code) => {
      if (code != 0) {
        return reject();
      }
      resolve();
    });
  });
};
