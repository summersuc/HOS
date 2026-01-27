# suki (suki) 项目开发规范 (Project Rules)

> [!IMPORTANT]
> 本文件定义了 suki 项目的核心开发准则。AI 助手在进行任何编码工作前必须阅读并严格遵守。

## 1. 核心原则 (Core Principles)
- **语言**：所有思考过程、对话回复、Git Commit **必须** 使用 **中文**。
- **思维模式**：First Principles (第一性原理) 分析问题，KISS (保持简单) 编写代码。
- **行动准则**：
    - 在修改复杂逻辑前，必须先阅读相关文件。
    - 严禁臆造不存在的 API 或库。
    - **Proactive**：主动检查潜在的破坏性变更。

## 2. 技术栈 (Tech Stack) - [Fixed]
- **框架**：React 19 + Vite
- **样式**：TailwindCSS v4 (利用 CSS Variables 做主题适配)
- **动画**：Framer Motion (标准 Spring 动画参数：`stiffness: 350, damping: 30`)
- **数据库**：Dexie.js (IndexedDB)
- **图标**：Lucide React
- **路由**：React Router v7

## 3. 固定逻辑与开发范式 (Fixed Logic & Patterns) - [Critical]

### A. 新 App 开发流程 (New App Workflow)
这是最容易出错的环节，开发新 App 时**必须**严格遵循以下步骤：
1.  **创建文件**：在 `src/apps/[AppName]` 创建目录。
2.  **入口组件**：必须包含 default export 的主组件 (通常是 `index.jsx` 或 `App.jsx`)。
3.  **注册元数据**：
    - 修改 `src/config/appRegistry.js`。
    - 添加 App ID、中文名称、图标 (Lucide Icon) 和窗口配置。
4.  **注册组件映射**：
    - 修改 `src/components/AppWindow/AppWindow.jsx`。
    - 导入新组件。
    - 在 `APP_COMPONENTS` 对象中添加映射 key (**必须**与 registry 中的 ID 一致)。

### B. 数据库与存储 (Database & Storage)
- **Schema 定义**：所有新表必须在 `src/db/schema.js` 中定义。
- **二进制数据 (图片/文件)**：
    - **严禁** 直接存储 Base64 到 IndexedDB。
    - **必须** 使用 `Blob` 格式存储。
    - **必须** 通过 `src/services/StorageService.js` 进行操作。
    - **分离存储 (Separation)**：[Performance] 在设计新表时(Schema v11+)，应尽量将 Blob 字段单独存放在 `blobs` 或专用表，主表仅存 ID 引用。

### C. 数据读取与渲染 (Reading & Rendering) - [PERFORMANCE CRITICAL]
- **响应式 UI**：所有从数据库读取的数据**必须**使用 `useLiveQuery` hook。
- **读写分离 (Read/Write Separation)**：
    - 在查询列表（如聊天记录、好友列表）时，**必须** 避免直接将庞大的 Blob 对象通过 React Props 传递。
    - 应传递 ID 或 引用字符串 (如 `idb:characters:123`)。
    - 列表查询应尽量使用投射 (Projection) 仅获取 ID, Name 等轻量字段。
- **头像/图片渲染**：
    - **必须** 使用 `<Avatar />` 组件 (`src/apps/Messenger/components/Avatar.jsx`)。
    - **Props 限制**：尽量只传递引用 (`src="idb:table:id"` 或 `characterId`)，让组件内部去处理缓存查找。
    - **严禁** 传递 Blob 对象给子组件的大列表。
    - **内部逻辑**：组件内部必须优先调用 `storageService.getCachedBlobUrl()` 命中内存缓存。
- **壁纸/大图渲染**：
    - **必须** 优先检查 `storageService.getCachedBlobUrl()` 以利用预加载缓存，避免重复创建 ObjectURL 导致闪烁。

### D. suki 设计语言 (Design Language)
- **Glassmorphism**：
    - 背景：`bg-white/80 dark:bg-black/60` + `backdrop-blur-xl`
    - 边框：`border border-white/20`
- **阴影**：使用 `tailwind.config.js` 中定义的 `shadow-card`, `shadow-float`。
- **移动端适配**：
    - 必须处理底部安全区：`pb-[env(safe-area-inset-bottom)]` 或组件内的 padding。
    - 必须禁止页面整体滚动 (overflow-hidden)，只允许内容区域滚动。

## 4. 目录结构规范 (Directory Structure)
- `src/apps/` - 独立的应用模块 (如 Music, Calendar)。
- `src/components/` - 全局共享组件 (如 AppWindow, Toast)。
  - `src/components/common/` - 基础 UI 组件。
- `src/hooks/` - 全局 Hooks (如 `useApp` 状态管理)。
- `src/services/` - 业务逻辑层 (如 LLMService, StorageService)。
