# React 18.2.0 源码调试项目 �?启动与调试指�?
## 1. 项目结构

```
react-18-debug/
├── src/                    # 调试�?Demo 应用
�?  ├── index.jsx           # 入口：createRoot().render(<StrictMode><App/></StrictMode>)
�?  ├── App.jsx             # 覆盖 hooks / 并发特�?/ Suspense+lazy 的示例组�?�?  ├── HeavyList.jsx       # lazy 动态加载的子组�?�?  └── index.css
├── public/
�?  └── index.html          # HTML 模板�?div id="root">�?├── react-source/           # React 18.2.0 源码（本地源码，�?npm 编译产物�?�?  └── packages/           # react / react-dom / react-reconciler / scheduler / shared ...
├── webpack.config.js       # 核心：把 react 等别名指向本地源�?+ fork 文件替换
├── package.json
└── plan.md                 # 本文�?```

## 2. 工作原理（为什么能调试源码�?
`webpack.config.js` 通过 `resolve.alias` �?`react` / `react-dom` / `react-reconciler` /
`scheduler` / `shared` / `react-is` 全部指向 `react-source/packages` 下的**本地源码**�?而不�?`node_modules` 里预先编译好的产物。因此浏览器里断点会直接落在 React 原始
（Flow 语法）源码上�?
配置中还有几个关键点�?
- **`@babel/preset-flow`**：把 React 源码里的 Flow 类型注解编译掉，变成普�?JS�?- **`NormalModuleReplacementPlugin`**：复刻官�?Rollup 构建时的「分叉文件替换」逻辑�?  - `ReactFiberReconciler` / `ReactEventPriorities` / `ReactFiberHotReloading` �?替换�?`.old` 版本
    （对�?OSS 构建 `enableNewReconciler = false`）�?  - `ReactFiberHostConfig`（占位文件）�?替换�?`forks/ReactFiberHostConfig.dom.js`�?  - `shared/ReactSharedInternals` �?替换�?`react/src/ReactSharedInternals.js`，消除循环依赖�?- **`DefinePlugin`**：注入全局 feature flags —�?`__DEV__ = true`（保留全�?dev 警告�?  StrictMode 行为）、`__PROFILE__ = false`、`__EXPERIMENTAL__ = false` 等�?- **`devtool: 'source-map'`**：生成完�?source map，断点与堆栈都能映射回源码行号�?
## 3. 环境要求

- Node.js（本项目当前环境�?`v22.22.1`�?- npm（当前环境为 `10.9.4`�?- `react-source/` 已内�?React 18.2.0 源码（`packages/shared/ReactVersion.js` 中为 `18.2.0`�?
## 4. 安装依赖

在项目根目录 `react-18-debug/` 下执行：

```powershell
npm install
```

> 仅需安装 webpack / babel 相关工具链，React 本身来自本地 `react-source/`，无需 npm 安装 React�?
## 5. 启动调试（开发服务器�?
```powershell
npm run dev
```

等价�?`webpack serve --config webpack.config.js`�?
- 服务器地址：http://localhost:3000
- 支持 HMR（hot: true�?- 编译报错会通过浏览�?overlay 直接显示

启动成功后浏览器打开 http://localhost:3000，即可看�?Demo 页面�?
## 6. 生产构建（可选）

```powershell
npm run build
```

产物输出�?`dist/bundle.js`（`output.clean: true` 会先清空 dist）�?
## 7. 如何进行源码调试

### 7.1 在浏览器 DevTools 里打断点

1. 启动 `npm run dev`，打开 http://localhost:3000�?2. 打开 Chrome DevTools（F12）→ **Sources** 面板�?3. 由于 `devtool: 'source-map'`，源码会以目录结构呈现，在左侧找�?   `webpack://` �?`react-source/packages/...` 下的源码文件�?4. 直接�?React 源码里点击行号打断点即可，随后在页面交互触发对应逻辑�?
### 7.2 推荐的断点位�?
| 调试目标 | 源码文件 | 关键函数 |
| --- | --- | --- |
| 入口 / 首次渲染 | `react-dom/src/client/ReactDOMRoot.js` | `createRoot`、`ReactDOMRoot.render` |
| render 调度 | `react-reconciler/src/ReactFiberWorkLoop.old.js` | `scheduleUpdateOnFiber`、`performConcurrentWorkOnRoot`、`renderRootConcurrent` |
| 调和 beginWork | `react-reconciler/src/ReactFiberBeginWork.old.js` | `beginWork`、`updateFunctionComponent`、`updateHostComponent` |
| 提交 commit | `react-reconciler/src/ReactFiberCommitWork.old.js` | `commitRoot`、`commitMutationEffects` |
| Hooks | `react-reconciler/src/ReactFiberHooks.old.js` | `useState` �?`mountState` / `updateState`、`useEffect` �?`mountEffect` |
| 调度�?| `scheduler/src/forks/Scheduler.js` | `unstable_scheduleCallback`、`workLoop` |
| 事件 | `react-dom/src/events/...` | �?`ReactDOMEventListener.js` 中的 `dispatchEvent` |
| Suspense / lazy | `react-reconciler/src/ReactFiberThrow.old.js`、`ReactLazy.js` | `throwException`、`lazyInitializer` |

> 提示：本项目 `enableNewReconciler = false`，因�?reconciler 实际走的�?**`.old` 系列文件**
> （`ReactFiberWorkLoop.old.js` / `ReactFiberHooks.old.js` / `ReactFiberBeginWork.old.js`）�?> 注意 `.old` 并不代表「旧版同步渲染」——React 18.2.0 �?`.old` reconciler 已经包含 lanes�?> 时间切片、`useTransition` 等全部并发能力，这才�?OSS 浏览器构建（ReactDOM）真正执行的路径�?> `.new` �?Facebook 内部 www 的实验版，OSS 构建不会加载它�?
### 7.3 �?`console.log` 快速观�?
在源码任意位置临时插�?`console.log(...)`，保存后 webpack-dev-server 会自动重新编译并
刷新页面（HMR），即可在控制台看到输出。注意不要修�?`react-source/` 里被 git 跟踪�?源码以免污染；调试完记得还原�?
### 7.4 观察关键数据结构（调试时常用�?
在断点处可在 Console 里查看：

- `workInProgress` / `current`：当�?fiber 与其上一次渲染的 fiber�?- `fiber.tag`：节点类型（`FunctionComponent=0`、`HostComponent=5` 等，�?  `react-reconciler/src/ReactWorkTags.js`）�?- `fiber.memoizedState`：hooks 链表�?- `root.memoizedState` 等调度优先级相关字段�?
## 8. 常见问题

- **报错找不�?`react-dom/client`**：确�?`react-source/packages/react-dom/client.js`
  存在（本项目已包含），该入口�?`createRoot` 的导出�?- **编译时出�?`unstable_yieldValue` / `unstable_setDisableYieldValue` 警告**�?  已知无害，`webpack.config.js` �?`ignoreWarnings` 已忽略，可放心继续�?- **断点落在编译产物而非源码**：确�?`devtool: 'source-map'` 生效，并�?Sources 面板
  选择 `webpack://` 下的源码文件，而非 `bundle.js`�?- **修改源码未热更新**：某�?React 内部模块变更后需手动刷新页面（HMR 对源码包�?  模块支持有限）�?- **StrictMode 导致 effect 执行两次**：这�?React 18 开发模式的预期行为，用于暴�?  effect 副作用问题，调试时需注意�?