# caniuse-cli 项目进度报告

## 项目概述

创建一个 CLI 工具，用于分析项目代码的浏览器兼容性。运行后启动本地服务并在浏览器中展示：
- 左侧：当前目录的文件树
- 右侧：选中文件/目录的最低浏览器版本要求
- 扫描时显示实时进度

### 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Bun |
| 包管理 | Bun |
| 后端框架 | ElysiaJS |
| 前端框架 | React + TypeScript |
| 文件扫描 | fast-glob |
| 代码分析 | @babel/parser + @babel/traverse |
| 兼容性数据 | caniuse-lite, @babel/compat-data, core-js-compat |
| 前端构建 | Vite + vite-plugin-singlefile |
| CLI 解析 | Commander |

---

## 已完成的工作

### 1. 项目初始化

- [x] 创建 `package.json`，配置依赖和 scripts
- [x] 创建项目目录结构
- [x] 配置 TypeScript (`tsconfig.json`)
- [x] 配置 Vite 用于前端构建 (`web/vite.config.ts`)
- [x] 创建单独的 `web/tsconfig.json` 解决 DOM 类型问题

### 2. 后端核心功能

#### CLI 入口 (`src/index.ts`)
- [x] 使用 Commander 解析命令行参数
- [x] 支持参数：`[directory]`, `-p/--port`, `-o/--open`, `--no-open`
- [x] 启动 Elysia 服务器
- [x] 自动打开浏览器
- [x] 处理 Ctrl+C 优雅退出

#### 文件扫描器 (`src/scanner/fileScanner.ts`)
- [x] 使用 fast-glob 扫描文件
- [x] 支持文件类型：`.js`, `.ts`, `.jsx`, `.tsx`, `.vue`
- [x] 忽略目录：`node_modules`, `build`

#### AST 分析器 (`src/scanner/astAnalyzer.ts`)
- [x] 使用 @babel/parser 解析代码
- [x] 使用 @babel/traverse 遍历 AST
- [x] 检测语法特性：
  - ES6+: arrow functions, classes, template literals, destructuring, spread
  - ES2016+: async/await
  - ES2019+: optional chaining, nullish coalescing
  - ES2020+: BigInt, dynamic import
  - ES2021+: logical assignment
  - ES2022+: top-level await, class fields
  - ES2023+: array methods (toSorted, toReversed, etc.)
- [x] 支持 Vue 单文件组件解析 (使用 @vue/compiler-sfc)

#### 浏览器兼容性计算 (`src/scanner/browserCompat.ts`)
- [x] 多数据源支持，按优先级查询：
  1. `MANUAL_FEATURE_VERSIONS` - 手动配置的 fallback
  2. `@babel/compat-data` - 语法特性（transform plugins）
  3. `caniuse-lite` - API 特性（原生支持版本）
  4. `core-js-compat` - Polyfill 模块（作为补充）
- [x] 特性名称映射到各数据源 ID (`src/scanner/featureMappings.ts`)
- [x] 数据源加载器 (`src/scanner/dataSources.ts`)
- [x] 计算各浏览器最低版本 (Chrome, Firefox, Safari, Edge)
- [x] 版本字符串规范化处理

#### Elysia 服务器 (`src/server/index.ts`)
- [x] CORS 支持
- [x] WebSocket 端点 (`/ws`) 用于实时进度推送
- [x] 静态文件服务 (生产模式)
- [x] SPA fallback (开发模式占位页面)

#### API 路由
- [x] `/api/file-tree` - 获取目录文件树 (`src/server/routes/fileTree.ts`)
- [x] `/api/analyze` - 分析指定文件/目录 (`src/server/routes/analyze.ts`)
- [x] `/api/analyze/file` - 获取单文件分析结果
- [x] `/api/analyze/cache` - 获取缓存结果
- [x] `/api/analyze/cache/clear` - 清除缓存

### 3. 前端界面

#### 基础结构
- [x] `web/index.html`
- [x] `web/src/main.tsx` - 入口文件
- [x] `web/vite.config.ts` - Vite 配置

#### 组件
- [x] `web/src/components/FileTree.tsx` - 文件树组件（可折叠、点击选择）
- [x] `web/src/components/BrowserBadge.tsx` - 浏览器版本徽章
- [x] `web/src/components/ProgressBar.tsx` - 扫描进度条
- [x] `web/src/components/ResultPanel.tsx` - 结果展示面板
- [x] `web/src/hooks/useWebSocket.ts` - WebSocket hook
- [x] `web/src/types/index.ts` - 类型定义
- [x] `web/src/App.tsx` - 主应用布局

### 4. 已修复的问题

| 问题 | 解决方案 |
|------|----------|
| `NullishCoalescingExpression` 不在 TraverseOptions 类型中 | 改用 `LogicalExpression` visitor 并检查 `??` 操作符 |
| `PrivateIdentifier` 未从 @babel/types 导出 | 移除该 visitor |
| caniuse-lite 无类型声明 | 使用 `require()` 并 fallback 到内置数据 |
| 前端 TS 找不到 `window`, `document` | 创建单独的 `web/tsconfig.json` 添加 DOM lib |
| `Object.values()` / `Object.entries()` 显示 "v1+" | `getCanIUseSupport` 未正确解压 caniuse-lite 压缩数据，需使用 `feature()` 函数解码 |
| `Array.prototype.includes()` 显示 Firefox 102 | core-js-compat 返回的是"需要 polyfill 的版本"而非"原生支持版本"，已将 `array-includes` 等特性映射到 caniuse-lite |
| Safari 返回 "TP" 版本 | `findMinSupportedVersion` 跳过 'TP'、'preview'、'all' 等特殊版本 |

---

### 已完成的新功能

1. **文件打开功能**
   - 添加 `/api/open-file` 端点 (`src/server/routes/openFile.ts`)
   - 通过 WebStorm CLI 打开文件并定位到指定行
   - 前端点击文件链接调用该端点

2. **结果面板增强**
   - Line 显示改为文件名:行号格式
   - 文件路径显示为超链接，点击后打开 WebStorm
   - Detected Features 按浏览器版本从高到低排序

3. **代码改进**
   - CodeFeature 类型添加 `maxVersion` 字段
   - 后端计算每个特性的最高版本要求用于排序

---

## 关键文件路径

| 功能 | 路径 |
|------|------|
| CLI 入口 | `src/index.ts` |
| 服务器入口 | `src/server/index.ts` |
| 分析 API | `src/server/routes/analyze.ts` |
| 文件树 API | `src/server/routes/fileTree.ts` |
| 扫描器入口 | `src/scanner/index.ts` |
| AST 分析 | `src/scanner/astAnalyzer.ts` |
| 浏览器兼容性 | `src/scanner/browserCompat.ts` |
| 数据源加载器 | `src/scanner/dataSources.ts` |
| 特性映射配置 | `src/scanner/featureMappings.ts` |
| 前端入口 | `web/src/main.tsx` |
| 主应用 | `web/src/App.tsx` |

---

## 快速启动命令

```bash
# 安装依赖
bun install

# 开发模式 - 后端
bun run dev

# 开发模式 - 前端 (另一个终端)
bun run web:dev

# 构建前端（打包成单个HTML文件）
bun run build

# 启动完整应用
bun run start --open
```

---

## 待完成的工作

### 5. 构建与发布优化

- [x] 添加 `vite-plugin-singlefile` 插件，将前端打包成单个内联HTML文件
- [x] 简化服务器代码，直接返回内联HTML
- [x] 添加 `build` 脚本用于发包
- [x] 更新 package.json 的 files 字段，包含打包后的文件

---

## 更新日志

- **2026-03-15**: 构建与发布优化
  - 添加 `vite-plugin-singlefile` 插件，前端打包成单个内联 HTML 文件 (204KB)
  - 简化服务器代码，移除静态资源路由，直接返回单文件 HTML
  - 添加 `build` 脚本，执行 `bun run build` 即可打包前端
  - 更新 `package.json` 的 `files` 字段，包含 `src` 和 `web/dist`
- **2026-03-15**: 修复浏览器兼容性数据源问题
  - 重构数据源架构：拆分为 `dataSources.ts` 和 `featureMappings.ts`
  - 修复 caniuse-lite 压缩数据解码问题
  - 新增 caniuse-lite 映射：`array-includes`, `array-find`, `array-findindex`, `string-includes`, `array-flat`
  - 修复 Safari 返回 "TP" 版本的问题
- **2024-03-15**: 修复 analyze 端点错误，添加文件打开功能和特性排序
- **2024-03-15**: 完成项目初始化和主要功能实现，正在调试 HTTP 请求错误
