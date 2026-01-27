import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Sub-pages
import APIPage from './pages/APIPage';
import AppsPage from './pages/AppsPage';
import ThemePage from './pages/ThemePage';
import DataPage from './pages/DataPage';
import IOSPage from '../../components/AppWindow/IOSPage';

import { triggerHaptic } from '../../utils/haptics';
import {
    BrainIcon,
    NotificationIcon,
    PaletteIcon,
    DataIcon,
    InfoIcon,
    ChevronIcon,
    BackIcon
} from './icons';

const SettingsItem = ({ icon: Icon, title, onClick, color }) => (
    <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={(e) => { triggerHaptic(); onClick(e); }}
        className="flex items-center justify-between p-4 bg-white/60 dark:bg-[#1C1C1E]/80 backdrop-blur-md mb-3 rounded-2xl shadow-card cursor-pointer border border-white/40 dark:border-white/5 transition-colors duration-200 active:bg-white/80 dark:active:bg-[#2C2C2E]"
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 ${color}`}>
                <Icon size={20} />
            </div>
            <span className="text-[17px] font-medium text-gray-800 dark:text-gray-100 tracking-wide">{title}</span>
        </div>
        <ChevronIcon size={20} className="text-gray-400 opacity-60" />
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
                        {/* 顶部导航栏 - V3 Soft Gradient Blur Style */}
                        <div className="absolute top-0 left-0 right-0 z-30">
                            {/* Background Layer (Blur & Gradient) */}
                            <div
                                className="absolute top-0 left-0 right-0 h-28 pointer-events-none bg-gradient-to-b from-[#F2F4F6]/95 to-transparent dark:from-black/90 dark:to-transparent backdrop-blur-xl"
                                style={{
                                    maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
                                    WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)'
                                }}
                            />

                            {/* Header Content */}
                            <div className="relative h-[50px] flex items-center justify-between px-2 pt-[env(safe-area-inset-top)] box-content transition-colors duration-300">
                                <button onClick={onClose} className="p-2 flex items-center gap-1 text-gray-400 dark:text-gray-400 active:opacity-50 transition-opacity">
                                    <BackIcon size={20} />
                                </button>
                                <span className="text-[17px] font-semibold text-gray-900 dark:text-white">设置</span>
                                <div className="w-[70px]"></div> {/* Balance spacer */}
                            </div>
                        </div>

                        {/* 内容区域 - 增加 paddingTop 以适配绝对定位的顶栏 */}
                        <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-4 pt-[calc(60px+env(safe-area-inset-top))]">


                            {/* Group 1: General */}
                            {/* Group 1: General */}
                            <div className="space-y-3">
                                <SettingsItem
                                    icon={BrainIcon} title="大脑连接 (API)"
                                    color="bg-transparent text-gray-400 dark:text-gray-500"
                                    onClick={() => setView('api')}
                                />
                                <SettingsItem
                                    icon={NotificationIcon} title="应用与通知"
                                    color="bg-transparent text-gray-400 dark:text-gray-500"
                                    onClick={() => setView('apps')}
                                />
                            </div>

                            {/* Group 2: Appearance */}
                            <div className="space-y-3">
                                <SettingsItem
                                    icon={PaletteIcon} title="主题美化"
                                    color="bg-transparent text-gray-400 dark:text-gray-500"
                                    onClick={() => setView('theme')}
                                />
                            </div>

                            {/* Group 3: Data & Info */}
                            <div className="space-y-3">
                                <SettingsItem
                                    icon={DataIcon} title="数据存储"
                                    color="bg-transparent text-gray-400 dark:text-gray-500"
                                    onClick={() => setView('data')}
                                />
                                <SettingsItem
                                    icon={InfoIcon} title="关于 suki"
                                    color="bg-transparent text-gray-400 dark:text-gray-500"
                                    onClick={() => alert('suki v0.9\nMade with Love')}
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
