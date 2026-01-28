import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import VConsole from 'vconsole'

// Initialize vConsole
new VConsole()

// 🔧 全局错误捕获 - 记录未捕获的错误
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

// 注册 Service Worker
// ⚠️ 注意：vite-plugin-pwa 已经自动注册 SW，这里只保留通知更新的逻辑
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 使用 vite-plugin-pwa 生成的 SW 路径，不再强制刷新
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration) {
        console.log('SW already registered by vite-plugin-pwa');

        // 监听更新 - 提示用户而不是自动刷新
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // 有新版本可用
                console.log('[SW] 发现新版本，但不自动刷新');
                // 可选：显示一个提示让用户手动刷新
              } else {
                console.log('[SW] 内容已缓存供离线使用');
              }
            }
          };
        };
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
