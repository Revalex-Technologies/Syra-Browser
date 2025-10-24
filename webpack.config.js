/* eslint-disable */
const { getConfig, dev } = require('./webpack.config.base');
const { spawn, execSync } = require('child_process');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

let terser = require('terser');
/* eslint-enable */

let electronProcess;

const mainConfig = getConfig({
  target: 'electron-main',

  devtool: dev ? 'inline-source-map' : false,

  watch: dev,

  entry: {
    main: './src/main',
  },

  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: require.resolve('@ghostery/adblocker-electron-preload'),
          to: 'preload.js',
          transform: async (fileContent) =>
            (await terser.minify(fileContent.toString())).code.toString(),
        },
      ],
    }),
  ],
});

if (process.env.ENABLE_EXTENSIONS) {
}

if (process.env.START === '1') {
  mainConfig.plugins.push({
    apply: (compiler) => {
      compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
        if (electronProcess) {
          try {
            if (process.platform === 'win32') {
              execSync(`taskkill /pid ${electronProcess.pid} /f /t`);
            } else {
              electronProcess.kill();
            }
            electronProcess = null;
          } catch (e) {}
        }

        const envCopy = { ...process.env };
        if (envCopy.NODE_OPTIONS) {
          delete envCopy.NODE_OPTIONS;
        }
        electronProcess = spawn('npm', ['start'], {
          shell: true,
          env: envCopy,
          stdio: 'inherit',
        });
      });
    },
  });
}

if (!mainConfig.plugins) mainConfig.plugins = [];
mainConfig.plugins.push(new CopyPlugin({
  patterns: [
    { from: 'static/pages/network-error.html', to: 'network-error.html' }
  ]
}));

const preloadConfig = getConfig({
  target: 'web',

  devtool: dev ? 'eval-cheap-module-source-map' : 'source-map',

  watch: dev,

  entry: {
    'view-preload': './src/preloads/view-preload',
    'extensions-preload': './src/preloads/extensions-preload',
  },

  module: {
  noParse: /electron-chrome-extensions[\\/](dist|lib)[\\/]chrome-extension-api\.preload\.js$/,
  rules: [
    {
      test: /electron-chrome-extensions[\\/](dist|lib)[\\/]chrome-extension-api\.preload\.js$/,
      parser: { requireContext: false, requireInclude: false, requireEnsure: false }
    }
  ]
},

plugins: [new ForkTsCheckerWebpackPlugin({
      async: dev,
      typescript: {
        memoryLimit: 4096,
        mode: 'readonly',
        configFile: 'tsconfig.json',
        typescriptPath: require.resolve('typescript'),
      },
    }),
    ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin(),

    // Narrow dynamic require context for electron-chrome-extensions (preload only)
    new (require('webpack')).ContextReplacementPlugin(
      /electron-chrome-extensions[\\/](dist|lib)/,
      require('path').resolve(__dirname, 'node_modules/electron-chrome-extensions/dist'),
      true,
      /^(chrome-extension-api\.preload\.js|index\.js)$/
    )
] : []),
  ],
});

module.exports = [mainConfig, preloadConfig];