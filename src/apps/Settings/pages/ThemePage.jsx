import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { db } from '../../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { appRegistry } from '../../../config/appRegistry';
import WidgetCenterPage from './WidgetCenterPage';
import FontPage from './FontPage';
import { Image, AppWindow, LayoutGrid, Type } from 'lucide-react';
import { triggerHaptic } from '../../../utils/haptics';

// Sub-components (could be in separate files, kept here for simplicity/context first)
// 1. Wallpaper Manager
const WallpaperSection = ({ onBack }) => {
    const [uploading, setUploading] = useState(false);
    // SAFE MODE: Don't use useLiveQuery, it hangs if DB is dead
    const [wallpaperBlob, setWallpaperBlob] = useState(null);
    const [wallpaperUrl, setWallpaperUrl] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                // 1. Try DB
                const fromDb = await db.wallpaper.get('current');
                if (fromDb?.data) {
                    setWallpaperBlob(fromDb.data);
                    return;
                }
            } catch (e) {
                console.warn('DB Wallpaper load failed', e);
            }
            // 2. Fallback to localStorage logic is handled in App.jsx via events, 
            // but here we might want to show something? 
            // For now let's rely on the App.jsx event bus or just show default
        };
        load();
    }, []);

    useEffect(() => {
        if (!wallpaperBlob) return;
        if (wallpaperBlob instanceof Blob) {
            const url = URL.createObjectURL(wallpaperBlob);
            setWallpaperUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setWallpaperUrl(wallpaperBlob); // base64
        }
    }, [wallpaperBlob]);

    // 清理 URL 内存
    useEffect(() => {
        return () => {
            if (wallpaperUrl && wallpaperUrl.startsWith('blob:')) {
                URL.revokeObjectURL(wallpaperUrl);
            }
        };
    }, [wallpaperUrl]);

    // 图片压缩工具函数
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // 限制最大宽高，防止 iOS 内存崩溃
                    const MAX_WIDTH = 1290; // iPhone 14 Pro Max width / 1
                    const MAX_HEIGHT = 2796;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // 压缩质量 0.7，输出 JPEG (iOS 对 JPEG 处理更友好)
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    }, 'image/jpeg', 0.7);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            // 1. 先尝试压缩
            const compressedBlob = await compressImage(file);

            // 2. 尝试存入数据库 (使用 Promise.race 防止死锁)
            try {
                // 设置一个 2秒 的超时，如果 Dexie 卡死直接报错
                const dbPromise = db.wallpaper.put({ id: 'current', type: 'image', data: compressedBlob });
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 2000));

                await Promise.race([dbPromise, timeoutPromise]);
                alert('壁纸已设置！(数据库存储)');
            } catch (dbError) {
                console.warn('DB write failed/timeout, trying localStorage fallback', dbError);

                // 3. 数据库挂了？启用 localStorage 应急方案
                // 转 Base64 并且更疯狂地压缩以适应 5MB 限制
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        localStorage.setItem('hos_wallpaper_fallback', reader.result);
                        // 手动触发更新
                        window.dispatchEvent(new Event('wallpaper-changed-fallback'));
                        alert('壁纸设置成功！✨'); // 静默切换到 localStorage，不打扰用户
                    } catch (lsError) {
                        alert('系统存储完全已满，无法保存壁纸。');
                    }
                };
                reader.readAsDataURL(compressedBlob);
            }
        } catch (error) {
            console.error('Wallpaper upload error:', error);
            // 如果是静默失败，不要弹窗吓用户
            alert(`设置需重试: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleReset = async () => {
        try {
            await db.wallpaper.clear();
            alert('已恢复默认壁纸 ✨');
        } catch (e) {
            console.error(e);
            alert('重置失败，请刷新后重试');
        }
    };

    return (
        <IOSPage title="壁纸设置" onBack={onBack}>
            <div className="p-5 flex flex-col items-center space-y-6">
                <div className="w-48 aspect-[9/19.5] bg-gray-100 dark:bg-black rounded-2xl shadow-xl overflow-hidden relative border-[6px] border-gray-200 dark:border-[#2C2C2E]">
                    {wallpaperUrl ? (
                        <img src={wallpaperUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#E0EAFC] to-[#CFDEF3] flex items-center justify-center text-gray-400 text-xs">Default</div>
                    )}
                    <div className="absolute bottom-3 left-2 right-2 h-10 bg-white/30 backdrop-blur-md rounded-xl"></div>
                </div>

                <div className="flex gap-4 w-full">
                    <label className="flex-1 bg-blue-500 text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center cursor-pointer shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform">
                        {uploading ? 'Processing...' : '上传图片'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button onClick={handleReset} className="px-6 py-3.5 bg-gray-100 dark:bg-[#2C2C2E] text-gray-600 dark:text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform">
                        默认
                    </button>
                </div>
                <p className="text-xs text-gray-400 text-center">建议尺寸: 1170x2532 (iPhone 12+)</p>
            </div>
        </IOSPage>
    );
};

// 2. Icon Manager (Migrated logic)
const IconManagerSection = ({ onBack }) => {
    // SAFE MODE: Manual load instead of liveQuery
    const [appOverrides, setAppOverrides] = useState([]);

    useEffect(() => {
        db.appOverrides.toArray().then(setAppOverrides).catch(e => {
            console.warn('Icon DB failed, using empty defaults', e);
            setAppOverrides([]);
        });
    }, []);

    const [editingApp, setEditingApp] = useState(null);
    const [editName, setEditName] = useState('');

    const startEdit = (appId) => {
        const override = appOverrides?.find(a => a.id === appId);
        setEditingApp(appId);
        setEditName(override?.name || appRegistry[appId].name);
    };

    const saveEdit = async (appId, newIcon = null) => {
        const override = appOverrides?.find(a => a.id === appId) || { id: appId };
        const updates = { ...override };
        if (editName.trim()) updates.name = editName;
        if (newIcon) updates.icon = newIcon;
        await db.appOverrides.put(updates);
        if (!newIcon) setEditingApp(null);
    };

    const handleIconUpload = (e, appId) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => saveEdit(appId, ev.target.result);
        reader.readAsDataURL(file);
    };

    const resetApp = async (appId) => {
        await db.appOverrides.delete(appId);
        setEditingApp(null);
    };

    return (
        <IOSPage title="图标与名称" onBack={onBack}>
            <div className="p-4 space-y-4 pb-24">
                {Object.values(appRegistry).map(app => {
                    const override = appOverrides?.find(a => a.id === app.id);
                    const finalName = override?.name || app.name;
                    const finalIcon = override?.icon || app.icon;
                    const isEditing = editingApp === app.id;

                    return (
                        <div key={app.id} className="bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl flex items-center gap-3 shadow-sm border border-gray-50 dark:border-white/5">
                            <div className="relative w-12 h-12 shrink-0 group">
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-[#2C2C2E] flex items-center justify-center border border-gray-200 dark:border-white/10 text-gray-400">
                                    {(() => {
                                        if (typeof finalIcon === 'string' && finalIcon.includes('/')) {
                                            return <img src={finalIcon} className="w-full h-full object-cover" />;
                                        }
                                        if (typeof finalIcon === 'function' || typeof finalIcon === 'object') {
                                            const IconComp = finalIcon;
                                            return <IconComp size={24} className="text-gray-500 dark:text-gray-400" />;
                                        }
                                        return <span className="font-bold text-gray-500">{app.name[0]}</span>;
                                    })()}
                                </div>
                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl cursor-pointer text-white transition-opacity">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleIconUpload(e, app.id)} />
                                </label>
                            </div>

                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <div className="flex items-center gap-1">
                                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-100 dark:bg-black px-2 py-1 rounded text-sm dark:text-white" autoFocus />
                                        <button onClick={() => saveEdit(app.id)} className="text-blue-500 p-1 border border-blue-200 dark:border-blue-800 rounded mx-0.5 bg-blue-50 dark:bg-blue-900/20"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
                                        <button onClick={() => setEditingApp(null)} className="text-gray-400 p-1 border border-gray-200 dark:border-gray-700 rounded mx-0.5 bg-gray-50 dark:bg-gray-800"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center" onClick={() => startEdit(app.id)}>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{finalName}</h4>
                                            <p className="text-[10px] text-gray-400 font-mono">ID: {app.id}</p>
                                        </div>
                                        {override && <button onClick={(e) => { e.stopPropagation(); resetApp(app.id); }} className="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">重置</button>}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </IOSPage>
    );
};

// Main Hub
const ThemePage = ({ onBack }) => {
    const [subPage, setSubPage] = useState(null);
    const [themeModeValue, setThemeModeValue] = useState('light');

    // SAFE MODE INIT
    useEffect(() => {
        // 1. LocalStorage First
        const local = localStorage.getItem('hos_theme_mode');
        if (local) setThemeModeValue(local);

        // 2. Try DB
        db.settings.get('theme_mode').then(rec => {
            if (rec?.value) setThemeModeValue(rec.value);
        }).catch(e => console.warn('Theme DB read failed', e));
    }, []);

    const toggleDarkMode = async () => {
        // 1. Calculate next state based on current LOCAL state
        const next = themeModeValue === 'dark' ? 'light' : 'dark';

        // 2. Update Local State immediately
        setThemeModeValue(next); // React State
        localStorage.setItem('hos_theme_mode', next); // LocalStorage

        // 2. 强制直接操作 DOM (最快反馈)
        if (next === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // 3. 写入 localStorage (可靠持久化)
        localStorage.setItem('hos_theme_mode', next);

        // 4. 发送自定义事件通知 App.jsx (如果有监听)
        window.dispatchEvent(new Event('theme-change'));

        // 5. 最后尝试写入数据库 (即使失败 UI 也已经变了)
        try {
            await db.settings.put({ key: 'theme_mode', value: next });
        } catch (e) {
            console.warn('Theme DB write failed, relying on localStorage', e);
        }
    };

    const HubItem = ({ icon, title, desc, color, onClick }) => (
        <button onClick={(e) => { triggerHaptic(); onClick(e); }} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-card border border-gray-50 dark:border-white/5 flex flex-col items-center gap-2 active:scale-95 transition-all text-center h-32 justify-center group">
            <div className={`w-12 h-12 rounded-full ${color} text-white flex items-center justify-center text-xl shadow-icon group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
            </div>
        </button>
    );

    return (
        <>
            <IOSPage title="Theme Hub" onBack={onBack}>
                <div className="p-5 pb-24 space-y-6">
                    {/* Hero Section / Current Status */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold">HOS Design</h2>
                            <p className="opacity-80 text-sm mt-1">打造你的专属小手机 v2.3 (Safe Mode)</p>
                        </div>
                        <div className="absolute right-[-20px] bottom-[-20px] opacity-20 text-9xl">🎨</div>
                    </div>

                    {/* Dark Mode Toggle (Quick Action) */}
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-50 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2C2C2E] flex items-center justify-center text-lg">
                                {themeModeValue === 'dark' ? '🌙' : '☀️'}
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white text-sm">深色模式</h3>
                                <p className="text-xs text-gray-400">Deep Night Mode</p>
                            </div>
                        </div>
                        <button onClick={toggleDarkMode} className={`w-12 h-7 rounded-full relative transition-colors ${themeModeValue === 'dark' ? 'bg-green-500' : 'bg-gray-200 dark:bg-[#3A3A3C]'}`}>
                            <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${themeModeValue === 'dark' ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                        </button>
                    </div>



                    {/* Grid Menu */}
                    <div className="grid grid-cols-2 gap-4">
                        <HubItem
                            icon={<Image size={24} />} title="壁纸" desc="Wallpaper"
                            color="bg-gradient-to-br from-blue-400 to-blue-500 shadow-blue-200 dark:shadow-none"
                            onClick={() => setSubPage('wallpaper')}
                        />
                        <HubItem
                            icon={<AppWindow size={24} />} title="应用图标" desc="Customize Icons"
                            color="bg-gradient-to-br from-pink-400 to-pink-500 shadow-pink-200 dark:shadow-none"
                            onClick={() => setSubPage('icons')}
                        />
                        <HubItem
                            icon={<LayoutGrid size={24} />} title="小组件" desc="Widgets Center"
                            color="bg-gradient-to-br from-orange-400 to-orange-500 shadow-orange-200 dark:shadow-none"
                            onClick={() => setSubPage('widgets')}
                        />
                        <HubItem
                            icon={<Type size={24} />} title="字体" desc="Typography"
                            color="bg-gradient-to-br from-teal-400 to-teal-500 shadow-teal-200 dark:shadow-none"
                            onClick={() => setSubPage('fonts')}
                        />
                    </div>
                </div>
            </IOSPage>

            {/* Sub Pages Navigation */}
            <AnimatePresence>
                {subPage === 'wallpaper' && <WallpaperSection onBack={() => setSubPage(null)} />}
                {subPage === 'icons' && <IconManagerSection onBack={() => setSubPage(null)} />}
                {subPage === 'widgets' && <WidgetCenterPage onBack={() => setSubPage(null)} />}
                {subPage === 'fonts' && <FontPage onBack={() => setSubPage(null)} />}
            </AnimatePresence>
        </>
    );
};

export default ThemePage;
