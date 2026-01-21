import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Sub-pages
import APIPage from './pages/APIPage';
import AppsPage from './pages/AppsPage';
import ThemePage from './pages/ThemePage';
import DataPage from './pages/DataPage';
import IOSPage from '../../components/AppWindow/IOSPage';

import {
    ChevronLeft, ChevronRight, Cpu, Bell, Palette, Database, Info
} from 'lucide-react';

import { triggerHaptic } from '../../utils/haptics';

const SettingsItem = ({ icon: Icon, title, onClick, color }) => (
    <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={(e) => { triggerHaptic(); onClick(e); }}
        className="flex items-center justify-between p-4 bg-white/60 dark:bg-[#1C1C1E]/80 backdrop-blur-md mb-3 rounded-2xl shadow-card cursor-pointer border border-white/40 dark:border-white/5 transition-colors duration-200 active:bg-white/80 dark:active:bg-[#2C2C2E]"
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shadow-icon ${color}`}>
                <Icon size={20} />
            </div>
            <span className="text-[17px] font-medium text-gray-800 dark:text-gray-100 tracking-wide">{title}</span>
        </div>
        <ChevronRight size={20} className="text-gray-400" />
    </motion.div>
);

const Settings = ({ onClose }) => {
    const [view, setView] = useState('main'); // main, api, apps, theme, data

    // Helper to determine if we are deeper in navigation
    const isRoot = view === 'main';

    return (
        <div className="w-full h-full relative bg-transparent overflow-hidden">
            {/* 1. Main View Layer (Always Mounted, Stable) */}
            <motion.div
                className="absolute inset-0 z-10"
                animate={{
                    // Disable scale/opacity effect to prevent transparency leak
                    scale: 1,
                    opacity: 1,
                }}
            >
                <IOSPage
                    title={null}
                    onBack={onClose}
                    enableEnterAnimation={false} // AppWindow handles opening
                >
                    <div className="absolute inset-0 flex flex-col bg-[#F2F4F6] dark:bg-black">
                        {/* 顶部导航栏 */}
                        <div className="h-[50px] shrink-0 flex items-center justify-between px-4 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-gray-100 dark:border-[#2C2C2E] z-10 pt-[env(safe-area-inset-top)] box-content transition-colors duration-300">
                            <button onClick={onClose} className="p-2 -ml-2 text-gray-800 dark:text-blue-500 font-semibold">
                                <span className="flex items-center gap-1"><ChevronLeft /></span>
                            </button>
                            <span className="text-[17px] font-semibold text-gray-900 dark:text-white">设置</span>
                            <div className="w-10"></div>
                        </div>

                        {/* 内容区域 */}
                        <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-4">
                            <div className="mt-2 mb-4">
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">Settings</h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">管理你的星野小手机</p>
                            </div>

                            {/* Group 1: General */}
                            {/* Group 1: General */}
                            <div className="space-y-3">
                                <SettingsItem
                                    icon={Cpu} title="大脑连接 (API)"
                                    color="bg-gray-100/80 dark:bg-zinc-800/80 text-gray-500 dark:text-gray-400"
                                    onClick={() => setView('api')}
                                />
                                <SettingsItem
                                    icon={Bell} title="应用与通知"
                                    color="bg-gray-100/80 dark:bg-zinc-800/80 text-gray-500 dark:text-gray-400"
                                    onClick={() => setView('apps')}
                                />
                            </div>

                            {/* Group 2: Appearance */}
                            <div className="space-y-3">
                                <SettingsItem
                                    icon={Palette} title="主题美化"
                                    color="bg-gray-100/80 dark:bg-zinc-800/80 text-gray-500 dark:text-gray-400"
                                    onClick={() => setView('theme')}
                                />
                            </div>

                            {/* Group 3: Data & Info */}
                            <div className="space-y-3">
                                <SettingsItem
                                    icon={Database} title="数据存储"
                                    color="bg-gray-100/80 dark:bg-zinc-800/80 text-gray-500 dark:text-gray-400"
                                    onClick={() => setView('data')}
                                />
                                <SettingsItem
                                    icon={Info} title="关于 HOS"
                                    color="bg-gray-100/80 dark:bg-zinc-800/80 text-gray-500 dark:text-gray-400"
                                    onClick={() => alert('HOSHINO OS v0.9\nMade with Love, React & Vite')}
                                />
                            </div>
                        </div>
                    </div>
                </IOSPage>
            </motion.div>

            {/* 2. Sub Pages Layer (On Top) */}
            <AnimatePresence>
                {view === 'api' && <APIPage onBack={() => setView('main')} />}
                {view === 'apps' && <AppsPage onBack={() => setView('main')} />}
                {view === 'theme' && <ThemePage onBack={() => setView('main')} />}
                {view === 'data' && <DataPage onBack={() => setView('main')} />}
            </AnimatePresence>

            {/* 3. Click Overlay for Background (Optional, to close subpage by clicking edge) */}
            {!isRoot && (
                <div
                    className="absolute inset-0 z-10 cursor-pointer"
                    onClick={() => setView('main')}
                    style={{ width: '20px' }} // Active edge area
                />
            )}
        </div>
    );
};

export default Settings;
