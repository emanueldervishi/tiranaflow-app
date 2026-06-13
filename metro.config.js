const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "ws") {
    return { type: "sourceFile", filePath: path.resolve(__dirname, "src/shims/ws.ts") };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
