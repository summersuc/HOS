import React, { useMemo, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Desktop from './components/Desktop/Desktop';
import AppWindow from './components/AppWindow/AppWindow';
import { AppProvider } from './hooks/useApp';
import { ThemeProvider } from './context/ThemeContext';
import { db } from './db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { useProactiveWatchdog } from './hooks/useProactiveWatchdog';

function App() {
  // Global Background Services
  useProactiveWatchdog();

  // --- 1. 数据库读取逻辑：增加异常捕获，防止崩坏 ---
  const wallpaperUser = useLiveQuery(async () => {
    try {
      return await db.wallpaper.get('current');
    } catch (e) {
      console.error("数据库壁纸读取失败，跳过...", e);
      return null;
    }
  });

  const themeModeDB = useLiveQuery(async () => {
    try {
      return await db.settings.get('theme_mode');
    } catch (e) {
      console.error("数据库主题读取失败，跳过...", e);
      return null;
    }
  });

  // --- 2. 壁纸处理逻辑 ---
  const wallpaperUrl = useMemo(() => {
    if (!wallpaperUser?.data) return null;
    try {
      if (wallpaperUser.data instanceof Blob) {
        return URL.createObjectURL(wallpaperUser.data);
      }
      return wallpaperUser.data;
    } catch (e) {
      return null;
    }
  }, [wallpaperUser?.data]);

  useEffect(() => {
    return () => {
      if (wallpaperUrl && wallpaperUrl.startsWith('blob:')) {
        URL.revokeObjectURL(wallpaperUrl);
      }
    };
  }, [wallpaperUrl]);

  const [fallbackWallpaper, setFallbackWallpaper] = useState(null);
  useEffect(() => {
    const loadFallback = () => {
      try {
        const stored = localStorage.getItem('hos_wallpaper_fallback');
        if (stored) setFallbackWallpaper(stored);
      } catch (e) { }
    };
    loadFallback();
    window.addEventListener('wallpaper-changed-fallback', loadFallback);
    return () => window.removeEventListener('wallpaper-changed-fallback', loadFallback);
  }, []);

  const finalWallpaper = wallpaperUrl || fallbackWallpaper;

  // --- 3. 深夜模式逻辑：彻底隔离磁盘报错 ---
  useEffect(() => {
    const root = window.document.documentElement;

    const updateTheme = () => {
      try {
        // 核心改动：不再依赖同步的数据库读取，优先读最稳的 localStorage
        const localTheme = localStorage.getItem('hos_theme_mode');
        const dbTheme = themeModeDB?.value;
        const currentMode = localTheme || dbTheme || 'light';

        if (currentMode === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      } catch (e) {
        console.error("切换主题时发生错误，强制恢复默认", e);
      }
    };

    updateTheme();
    window.addEventListener('theme-change', updateTheme);
    return () => window.removeEventListener('theme-change', updateTheme);
  }, [themeModeDB?.value]);

  // --- 4. 渲染界面 ---
  return (
    <BrowserRouter>
      <AppProvider>
        <ThemeProvider>
          <div
            className="relative w-full h-[100dvh] overflow-hidden bg-transparent text-gray-900 select-none"
            style={{ fontFamily: 'var(--system-font, "Inter", sans-serif)' }}
          >
            {/* 壁纸层 */}
            <div className="fixed inset-0 z-[-1] bg-[#F5F5F7] dark:bg-black transition-colors duration-500 overflow-hidden">
              {finalWallpaper ? (
                <img src={finalWallpaper} className="w-full h-full object-cover" alt="wallpaper" />
              ) : (
                <>
                  <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/30 dark:bg-indigo-500/10 blur-[100px] transition-colors duration-500" />
                  <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-100/30 dark:bg-purple-500/10 blur-[100px] transition-colors duration-500" />
                </>
              )}
            </div>

            <div className="relative z-10 w-full h-full">
              <Desktop />
            </div>
            <AppWindow />
          </div>
        </ThemeProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
