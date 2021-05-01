const ora = require("ora");
const { project } = require("xcode");
const { join } = require("path");
const prompt = require("prompt");
const logger = require("./logger");
const { promises } = require("fs");
const execa = require("execa");
const chalk = require("chalk");

const bundleScriptPatch =
  '"set -e\\n\\nexport NODE_BINARY=node\\nexport PLATFORM_NAME=ios\\n../node_modules/react-native/scripts/react-native-xcode.sh\\n"';

module.exports.run = async (config, show_prompt) => {
  if (show_prompt) {
    prompt.message = prompt.delimiter = "";
    const res = await prompt.get({
      name: "confirm",
      message: "This tool will overwrite iOS project files. Continue? [y/N]",
    });
    if (res.confirm.toLowerCase() != "y") {
      logger.info("Cancelled");
      return;
    }
  }

  const patchSpinner = ora().start("Patching xcodeproj");
  const iosPath = join(process.cwd(), "ios");
  const projectPath = join(
    iosPath,
    config.name + ".xcodeproj",
    "project.pbxproj"
  );
  const podfilePath = join(iosPath, "Podfile");

  const proj = new project(projectPath).parseSync();
  for (const target of Object.values(proj.pbxNativeTargetSection())) {
    if (target.name == config.name) {
      const { buildConfigurations } = proj.pbxXCConfigurationList()[
        target.buildConfigurationList
      ];
      for (const { value } of buildConfigurations) {
        //   console.log(proj.pbxXCBuildConfigurationSection()[value].buildSettings);
        const buildSettings =
          proj.hash.project.objects.XCBuildConfiguration[value].buildSettings;
        buildSettings.TARGETED_DEVICE_FAMILY = '"1,2,6"';
        buildSettings.SUPPORTS_MACCATALYST = "YES";
        buildSettings.SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = "NO";
      }
    }
  }
  for (const id in proj.hash.project.objects.PBXShellScriptBuildPhase) {
    if (!id.endsWith("_comment")) {
      if (
        proj.hash.project.objects.PBXShellScriptBuildPhase[id].name ==
        '"Bundle React Native code and images"'
      ) {
        proj.hash.project.objects.PBXShellScriptBuildPhase[
          id
        ].shellScript = bundleScriptPatch;
      }
    }
  }
  await promises.writeFile(projectPath, proj.writeSync());
  patchSpinner.succeed("Patched xcodeproj");

  const podfileSpinner = ora().start("Patching Podfile");
  let podfile = await promises.readFile(podfilePath, "utf8");
  podfile = podfile
    .split("\n")
    .map((line) => line.replace(/^(\s+)(use_flipper\!\(\))$/, "$1# $2"))
    .join("\n");
  await promises.writeFile(podfilePath, podfile);
  podfileSpinner.stop("Patched Podfile");

  const podSpinner = ora().start(
    `Updating Pods ${chalk.gray("(This may take a moment)")}`
  );
  try {
    const podOutput = await execa("pod", ["install"], {
      cwd: iosPath,
      all: true,
    });
    podSpinner.clear();
    logger.debug(`${podOutput.command}`);
    logger.debug(podOutput.all);
    podSpinner.succeed("Pods Updated");
  } catch (e) {
    podSpinner.clear();
    logger.error(e);
    podSpinner.fail("Pod Install Failed");
    return;
  }

  ora().succeed("Done");

  console.log(`${chalk.white.bold("To run your app on macOS:")}
    ${chalk.reset("react-native-catalyst run")}
  `);
};
