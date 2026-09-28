const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build loads a .wasm module (wa-sqlite) that Metro
// doesn't treat as an asset by default.
config.resolver.assetExts.push("wasm");

module.exports = config;
