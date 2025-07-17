const webpack = require('webpack');

console.log("✅ CRACO config file is being loaded!");

module.exports = {
  style: {
    postcssOptions: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Find the rule that handles JS/TS files
      const jsRule = webpackConfig.module.rules.find(
        (rule) => Array.isArray(rule.oneOf)
      )?.oneOf.find(
        (oneOfRule) =>
          oneOfRule.loader &&
          oneOfRule.loader.includes('babel-loader') || // Or sucrase-loader, or similar
          (oneOfRule.options && oneOfRule.options.customize && oneOfRule.options.customize.endsWith('babel-preset-react-app'))
      );

      if (jsRule) {
        // Exclude CSS files from being processed by the JS loader
        if (!jsRule.exclude) {
          jsRule.exclude = [];
        }
        // Ensure that .css files, especially from node_modules, are excluded from JS/TS loaders
        jsRule.exclude.push(/\.css$/);
      }

      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify"),
        "url": require.resolve("url"),
        "fs": false,
        "path": require.resolve("path-browserify"),
        "zlib": require.resolve("browserify-zlib"),
        "vm": require.resolve("vm-browserify"),
        "encoding": false,
      };

      webpackConfig.module.rules.push({
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      });

      webpackConfig.ignoreWarnings = [/Failed to parse source map/];

      return webpackConfig;
    },
    plugins: {
      add: [
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        }),
      ],
    },
  },
};