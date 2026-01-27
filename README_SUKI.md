# suki (suki) Project Documentation

> 运行在 iOS 上的沉浸式 PWA Web 应用。

## 目录结构 (Directory Structure)

```
src/
├── apps/         # 独立 App 模块 (Settings, Messenger 等)
├── components/   # UI 组件
│   ├── Desktop/  # 桌面相关 (Grid, Icon)
│   ├── Dock/     # 底部 Dock 栏
│   ├── AppWindow/# App 运行容器
│   └── common/   # 通用组件 (GlassPanel)
├── config/       # 配置文件 (App 注册表)
├── db/           # Dexie 数据库定义
├── hooks/        # React Hooks (useApp)
├── styles/       # 全局样式与 iOS 适配
├── App.jsx       # 根组件 (Layout & Router)
└── main.jsx      # 入口 (SW 注册)
```

## 核心功能索引

| 功能 | 实现文件 | 说明 |
|------|----------|------|
| **App 注册表** | `src/config/appRegistry.js` | 配置 App 列表、图标、通讯模式 |
| **iOS 全屏适配** | `src/styles/index.css` | 解决 CSS 100vh 问题，处理安全区域 |
| **App 状态管理** | `src/hooks/useApp.js` | 管理打开/关闭/最小化 App |
| **窗口动画** | `src/components/AppWindow/AppWindow.jsx` | Framer Motion 实现的丝滑开关动画 |
| **数据存储** | `src/db/schema.js` | Dexie.js 数据库 Schema |
| **PWA 推送** | `public/sw.js` | Service Worker 推送监听 |

## 扩展指南 (How to Add a New App)

### 1. 注册 App
打开 `src/config/appRegistry.js`，在 `appRegistry` 对象中添加新条目：
```javascript
newApp: {
  id: 'newApp',
  name: '新应用',
  icon: 'icon_path_or_name',
  component: 'NewAppComponent', // 需在 apps/ 目录下创建对应组件
  transmissionMode: 'C',
},
```

### 2. 创建组件
在 `src/apps/` 下创建 `NewApp/index.jsx`。

### 3. (可选) 添加到桌面或 Dock
修改 `src/components/Desktop/Desktop.jsx` 中的 `desktopApps` 数组，或 `src/config/appRegistry.js` 中的 `defaultDockApps`。

## iOS 调试说明
1. 确保 iPhone 和开发机在同一局域网。
2. 使用 Safari 访问开发机 IP+端口。
3. 点击 "分享" -> "添加到主屏幕"。
4. 从主屏幕打开，检查是否全屏且无底部白条。

