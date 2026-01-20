const { getDefaultConfig } = require("expo/metro-config");

/** @type {import("expo/metro-config").MetroConfig} */
const config = getDefaultConfig(__dirname);

// Workaround for Metro resolving ESM "exports" entries that may contain `import.meta`,
// which can break the classic script bundle used by Expo Web dev server.
config.resolver.unstable_enablePackageExports = false;

// Prefer CommonJS `main` over ESM `module` for web to avoid `import.meta` leaks.
// (Keep `browser` so packages can provide web-friendly shims.)
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

module.exports = config;

