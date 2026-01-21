# HOS Music App (Netease Edition) 设计方案 🎵

宝宝，你的直觉非常准！那个“简单的 HTML 都能实现”的技术背后，其实是因为有一个开源社区维护的神级项目 —— `NeteaseCloudMusicApi`。

要在 HOS 里实现扫码登录听歌，这不仅可行，而且还能做得比官方网页版更漂亮。

## 1. 技术底座：为什么是网易云？ (The "Why" & "How") 🛠️

*   **QQ 音乐 vs 网易云**：
    *   QQ 音乐的接口加密极其变态（且经常变），第三方客户端经常还是“灰色”听不了。
    *   **网易云 (NCM)**：有一个极其成熟的 Node.js 开源接口项目，支持**扫码登录**、**歌单获取**、**VIP 音质解析**（前提是你账号是 VIP）。
*   **"魔法"揭秘**：
    *   HOS (前端) 不能直接连网易云服务器（会有跨域 CORS 保护）。
    *   **解决方案**：我们需要在你的电脑上跑一个小小的“中间人服务”（API Server）。
    *   *对你的要求*：以后启动 HOS 时，除了 `npm run dev`，还需要多运行一个命令 `npx NeteaseCloudMusicApi`。

---

## 2. UI 设计方案：Sonic Glass (声之玻璃) 💎

既然是 HOS，我们要做的就是**超越官方 App** 的审美。

### 2.1 沉浸式播放页 (Immersive Player)
*   **核心视觉**：
    *   **动态流光背景**：提取当前 `Album Art` (专辑封面) 的主色调，生成一个巨大的、缓慢流动的 `Mesh Gradient` (网格渐变) 作为 AppWindow 的背景。
    *   **黑胶/CD 模式**：
        *   中间不要方形封面，要做成**旋转的黑胶唱片**。
        *   唱针 (Tonearm) 只有在播放时才会移上去，暂停时移开。这种拟物感 (Skeuomorphism) 会非常精致。
*   **歌词展示**：
    *   参考 Apple Music 的 **“K歌模式”**，当前歌词高亮放大，背景模糊，非当前歌词缩小变淡。

### 2.2 登录体验 (QR Login)
*   **界面**：一个极简的玻璃卡片悬浮在中央。
*   **流程**：
    1.  显示二维码（由 API 生成）。
    2.  用户用手机网易云扫码。
    3.  检测到扫码 -> 头像处显示用户头像 -> 提示“请在手机确认”。
    4.  确认成功 -> 卡片翻转 (3D Flip) -> 进入主界面。

### 2.3 桌面联动 (Desktop Widget)
*   **灵动岛 / Mini Player**：
    *   当 Music App“最小化”时，不要完全消失。
    *   在桌面的右上角或底部 Dock 上方，保留一个**长条形的 Mini Player**。
    *   显示：`[封面小图] [歌名 - 歌手] [ ❚❚ ] [ ►►| ]`。
    *   背景：磨砂玻璃，带音频跳动频谱 (Visualizer)。

---

## 3. 功能开发路线图 (Functionality Roadmap)

1.  **Phase 1: 联通 API**
    *   搭建本地 API 服务。
    *   实现 `/login/qr` 接口逻辑 (前端轮询检查扫码状态)。
    *   保存 `cookie` 到 IndexedDB (这样下次不用重扫)。

2.  **Phase 2: 核心播放器**
    *   使用 HTML5 `<audio>` 标签。
    *   封装 `useAudio` Hook：管理播放、暂停、进度、音量（注意：浏览器有一些自动播放策略限制，需要处理）。

3.  **Phase 3: 数据展示**
    *   “我的喜爱”歌单。
    *   每日推荐歌曲。

---

## 4. 给开发小哥的指令 (Prompt for Dev)

> **To Frontend Dev**:
> 1.  Run `npx NeteaseCloudMusicApi` locally on port 3000.
> 2.  In HOS `vite.config.js`, add a proxy:
>     ```js
>     proxy: {
>       '/music-api': {
>         target: 'http://localhost:3000',
>         changeOrigin: true,
>         rewrite: (path) => path.replace(/^\/music-api/, '')
>       }
>     }
>     ```
> 3.  Use this endpoint structure. Don't call Netease directly.

宝宝，如果你觉得这个方案 OK，我们就先从 **UI 设计** 开始，还是先搞定 **API 环境**？
