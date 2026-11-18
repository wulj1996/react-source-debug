const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// React 18.2.0 源码根目录（git clone --branch v18.2.0）
const reactPackages = path.resolve(__dirname, 'react-source/packages');

// 让 webpack 把 react / react-dom / react-reconciler / scheduler / shared
// 全部指向本地源码，而不是 node_modules 里的编译产物
const alias = {
  react: path.join(reactPackages, 'react'),
  'react-dom': path.join(reactPackages, 'react-dom'),
  'react-reconciler': path.join(reactPackages, 'react-reconciler'),
  scheduler: path.join(reactPackages, 'scheduler'),
  shared: path.join(reactPackages, 'shared'),
  'react-is': path.join(reactPackages, 'react-is'),
};

// React 源码中存在一些「占位/分叉」文件，正式构建时会被 Rollup 替换掉。
// 这里用 NormalModuleReplacementPlugin 复刻同样的替换逻辑（对应 OSS 浏览器构建）：
//   1. ReactFiberReconciler / ReactEventPriorities / ReactFiberHotReloading
//      这三个文件同时 import 了 .old 和 .new 两个版本，运行时按 enableNewReconciler 二选一。
//      OSS 构建使用 .old 版本（enableNewReconciler = false），这里直接替换为 .old。
//   2. ReactFiberHostConfig 是占位文件（import 后直接 throw），
//      需替换为 react-dom 对应的 dom host config。
const shimOldReconciler = file =>
  new webpack.NormalModuleReplacementPlugin(
    new RegExp(`${file}$`),
    path.join(reactPackages, `react-reconciler/src/${file}.old.js`)
  );

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'src/index.jsx'),
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    alias,
    extensions: ['.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                { targets: { chrome: '80' }, modules: false },
              ],
              ['@babel/preset-react', { runtime: 'classic' }],
              '@babel/preset-flow',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
    }),
    // React 构建时注入的全局 feature flags，对应 OSS 开发版：
    // __DEV__ = true 保留全部 dev 警告与 StrictMode 行为，便于调试。
    new webpack.DefinePlugin({
      __DEV__: true,
      __PROFILE__: false,
      __EXPERIMENTAL__: false,
      __UMD__: false,
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    shimOldReconciler('ReactFiberReconciler'),
    shimOldReconciler('ReactEventPriorities'),
    shimOldReconciler('ReactFiberHotReloading'),
    // 官方 Rollup 构建会把 react 包内部的 shared/ReactSharedInternals
    // 替换为 react/src/ReactSharedInternals.js，以避免「react 还没初始化完
    // 就被读取 __SECRET_INTERNALS」的循环依赖。二者导出的是同一个对象，
    // 这里统一替换，彻底消除循环依赖。
    new webpack.NormalModuleReplacementPlugin(
      /shared[\\/]ReactSharedInternals$/,
      path.join(reactPackages, 'react/src/ReactSharedInternals.js')
    ),
    new webpack.NormalModuleReplacementPlugin(
      /ReactFiberHostConfig$/,
      path.join(
        reactPackages,
        'react-reconciler/src/forks/ReactFiberHostConfig.dom.js'
      )
    ),
  ],
  devServer: {
    static: { directory: path.resolve(__dirname, 'public') },
    port: 3000,
    open: false,
    hot: true,
    client: {
      overlay: true,
    },
  },
  // 这两个导出只存在于测试用的 scheduler/unstable_mock 里，
  // 浏览器开发版中为 undefined（且不会被调用），属于已知的无害告警。
  ignoreWarnings: [
    {
      module: /react-reconciler[\\/]src[\\/]Scheduler\.js$/,
      message: /unstable_yieldValue|unstable_setDisableYieldValue/,
    },
  ],
};
