const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
const archive = path.join(__dirname, "assets/exercises/repdb/free.en.json");
const images = path.join(__dirname, "assets/exercises/repdb/image-registry.js");
config.resolver.resolveRequest = (context, name, platform) => {
  if (name === "repdb-archive") {
    return context.resolveRequest(
      context,
      archive,
      platform,
    );
  }
  if (name === "repdb-images") {
    return context.resolveRequest(
      context,
      images,
      platform,
    );
  }
  return context.resolveRequest(context, name, platform);
};
module.exports = config;
