// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ✅ Add support for CommonJS files and fix socket.io resolution
config.resolver.sourceExts.push('cjs');
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'engine.io-client': path.resolve(__dirname, 'node_modules/engine.io-client'),
};

module.exports = config;
