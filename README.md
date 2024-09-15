# QVue: 一个简易的 Vue 实现

## 简介

QVue 是一个简化版的 Vue.js 实现，旨在帮助开发者理解 Vue.js 的核心原理。通过 QVue，您可以深入了解 Vue.js 的数据绑定、指令解析和响应式系统的基本机制。

## 功能

- **数据响应**：自动追踪数据变化并更新视图。
- **指令解析**：支持自定义指令（例如 `q-text`、`q-html`、`q-model`）和事件处理。
- **模板编译**：将 HTML 模板编译为 DOM 元素，并绑定 Vue 实例的数据和方法。

## 结构

### `QVue` 类

`QVue` 类是核心类，它负责初始化 Vue 实例，处理数据响应和模板编译。

- **构造函数**：接收 `options` 对象，包含 `data`、`methods` 和其他 Vue 配置。
- **`observe` 方法**：实现数据响应，使用 `Object.defineProperty` 监视数据的变化。
- **`proxyData` 方法**：将 `data` 中的属性代理到 Vue 实例上。
- **`defineReactive` 方法**：实现数据的响应式，包含递归处理数据嵌套。

### `Compile` 类

`Compile` 类负责编译模板，解析插值、指令和事件，并将数据绑定到 DOM 元素。

- **`node2Fragment` 方法**：将 DOM 元素转换为文档片段。
- **`compile` 方法**：遍历文档片段中的节点，处理插值、指令和事件。
- **`update` 方法**：更新 DOM 元素的内容，创建 `Watcher` 实例以响应数据变化。

### `Subject` 类

`Subject` 类用于管理 `Watcher` 实例，并通知它们数据变化。

- **`addWatcher` 方法**：注册 `Watcher` 实例。
- **`notify` 方法**：通知所有注册的 `Watcher` 实例进行更新。

### `Watcher` 类

`Watcher` 类是观察者，它负责在数据变化时更新视图。

- **构造函数**：将当前 `Watcher` 实例设置为 `Subject.target`，以便在 getter 中添加依赖。
- **`update` 方法**：调用注册的更新函数，更新视图。