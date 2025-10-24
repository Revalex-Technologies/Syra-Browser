/* eslint-disable */
const { resolve } = require('path');
const { merge } = require('webpack-merge');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const createStyledComponentsTransformer =
  require('typescript-plugin-styled-components').default;
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
/* eslint-enable */

const INCLUDE = resolve(__dirname, 'src');

const BUILD_FLAGS = {
  ENABLE_EXTENSIONS: true,
  ENABLE_AUTOFILL: false,
};

// expose flags to app
process.env = {
  ...process.env,
  ...BUILD_FLAGS,
};

const dev = process.env.DEV === '1';
process.env.NODE_ENV = dev ? 'development' : 'production';

const styledComponentsTransformer = createStyledComponentsTransformer({
  minify: !dev,
  displayName: dev,
});

const tsLoader = {
  loader: 'ts-loader',
  options: {
    experimentalWatchApi: dev,
    transpileOnly: true,
    getCustomTransformers: () => ({
      before: [styledComponentsTransformer],
    }),
  },
};

const rules = [
  {
    test: /\.(png|jpe?g|gif|svg|ico|icns)$/i,
    type: 'asset/resource',
    generator: {
      filename: 'res/[name].[contenthash:8][ext]',
    },
  },

  {
    test: /\.(woff2?|eot|ttf|otf)$/i,
    type: 'asset/resource',
    generator: {
      filename: 'res/fonts/[name].[contenthash:8][ext]',
    },
  },

  {
    test: /\.(tsx?|ts)$/,
    include: INCLUDE,
    use: [tsLoader],
  },
];

const config = {
  mode: dev ? 'development' : 'production',

  devtool: dev ? 'eval-cheap-module-source-map' : 'source-map',

  output: {
    path: resolve(__dirname, 'build'),
    devtoolModuleFilenameTemplate: info => `file:///${info.absoluteResourcePath.replace(/\\/g, '/')}`,
    filename: '[name].bundle.js',
    // Use a non-MD4 hash to avoid OpenSSL complications.
    hashFunction: 'xxhash64',
    assetModuleFilename: 'res/[name].[contenthash:8][ext]',
  },

  module: { rules },

  node: {
    __dirname: false,
    __filename: false,
  },

  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.tsx', '.ts', '.json'],
    alias: { '~': INCLUDE },
    plugins: [new TsconfigPathsPlugin()],
  },

  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV', ...Object.keys(BUILD_FLAGS)]),
    new ForkTsCheckerWebpackPlugin({
      async: dev,
      typescript: {
        diagnosticOptions: { semantic: true, syntactic: true },
      },
    }),
  ],

  externals: {
    keytar: `require('keytar')`,
    electron: 'require("electron")',
    fs: 'require("fs")',
    os: 'require("os")',
    path: 'require("path")',
  },

  optimization: {
    minimize: !dev,
    minimizer: !dev
      ? [
          new TerserPlugin({
            extractComments: true,
            terserOptions: {
              ecma: 2017,
              output: { comments: false },
            },
            parallel: true,
          }),
        ]
      : [],
  },
};

function getConfig(...cfg) {
  return merge(config, ...cfg);
}

const getHtml = (name) =>
  new HtmlWebpackPlugin({
    title: 'Wexond',
    template: 'static/pages/app.html',
    filename: `${name}.html`,
    chunks: [name],
  });

const applyEntries = (cfg, entries) => {
  for (const entry of entries) {
    cfg.entry[entry] = [
      `./src/renderer/pre-entry`,
      `./src/renderer/views/${entry}`,
    ];
    cfg.plugins.push(getHtml(entry));
  }
};

const getBaseConfig = (name) => {
  const cfg = {
    stats: {
      warningsFilter: [
        /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
        /electron-chrome-extensions/,
      ],
    },
    module: {
      exprContextCritical: false,
      unknownContextCritical: false,
    },
    ignoreWarnings: [
      (w) => /Critical dependency: require function/.test(w.message || '') &&
              /electron-chrome-extensions/.test((w.module && w.module.resource) || ''),
    ],
    performance: {
      maxAssetSize: 400000,
      maxEntrypointSize: 450000,
      hints: 'warning'
    },
    plugins: [],

    output: {},

    entry: {},

    optimization: {
      runtimeChunk: { name: `runtime.${name}` },
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
      },
    },
  };

  return cfg;
};

module.exports = { getConfig, dev, getHtml, applyEntries, getBaseConfig };