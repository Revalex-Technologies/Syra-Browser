/* eslint-disable */
const {
  getConfig,
  applyEntries,
  getBaseConfig,
  dev,
} = require('./webpack.config.base');
const { join } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpack = require('webpack');
/* eslint-enable */

const PORT = 4444;

const appConfig = getConfig(getBaseConfig('app'), {
  target: 'web',

  devServer: {
    static: {
      directory: join(__dirname, 'build'),
    },
    port: PORT,
    hot: true,
    allowedHosts: 'all',
    client: {
      overlay: false,
    },
  },

  plugins: dev
    ? [
        new webpack.HotModuleReplacementPlugin(),
        new ReactRefreshWebpackPlugin({ overlay: false }),
      ]
    : [],

  externals: {},

  resolve: {
    alias: {
      ...(getBaseConfig('app').resolve?.alias || {}),
      electron: '@electron/remote',
    },
  },
});

applyEntries(appConfig, [
  ...(process.env.ENABLE_AUTOFILL ? ['form-fill', 'credentials'] : []),
  'app',
  'permissions',
  'auth',
  'find',
  'menu',
  'search',
  'preview',
  'tabgroup',
  'downloads-dialog',
  'add-bookmark',
  'zoom',
  'settings',
  'history',
  'newtab',
  'bookmarks',
  'downloads',
]);

// Inject static network error page into build output so protocol handler can serve it
if (!appConfig.plugins) appConfig.plugins = [];
appConfig.plugins.push(
  new HtmlWebpackPlugin({
    filename: 'network-error.html',
    template: join(__dirname, 'static/pages/network-error.html'),
    // no chunks needed; this is a static fallback page
    chunks: []
  })
);

// Inject react-refresh for renderer TS only (dev mode)
if (dev) {
  appConfig.module.rules.unshift({
    test: /\.(tsx?|ts)$/,
    include: require('path').resolve(__dirname, 'src/renderer'),
    enforce: 'pre',
    use: [
      {
        loader: 'babel-loader',
        options: { plugins: ['react-refresh/babel'] },
      },
    ],
  });
}

module.exports = appConfig;
