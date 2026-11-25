// Adds .riv to the asset extensions so Kak Pinta's Rive file can be bundled.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("riv");

module.exports = config;
