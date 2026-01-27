import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IOSPage from './IOSPage';
import { useApp } from '../../hooks/useApp';
import { appRegistry } from '../../config/appRegistry';

// 导入已实现的 App 组件
import Settings from '../../apps/Settings';
import Messenger from '../../apps/Messenger';
import Calendar from '../../apps/Calendar';
import Music from '../../apps/Music';
import SmallWorld from '../../apps/SmallWorld';
import Heartbeat from '../../apps/Heartbeat';

// 组件映射表
const APP_COMPONENTS = {
    settings: Settings,
    messenger: Messenger,
    calendar: Calendar,
    music: Music,
    world: SmallWorld,
    heartbeat: Heartbeat,
    // 其他 App 暂时未实现，后续添加
};

const AppWindow = () => {
    const { activeAppId, closeApp, appParams } = useApp();
    const app = activeAppId ? appRegistry[activeAppId] : null;

    // 获取当前 App 对应的组件
    const ActiveComponent = activeAppId ? APP_COMPONENTS[activeAppId] : null;

    return (
        <AnimatePresence>
            {activeAppId && app && (
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0, x: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="fixed inset-0 z-50 bg-transparent overflow-hidden flex flex-col"
                >
                    {/* 如果找到了组件，就渲染组件；否则显示开发中提示 */}
                    {ActiveComponent ? (
                        <ActiveComponent onClose={closeApp} initialParams={appParams?.[activeAppId]} />
                    ) : (
                        <IOSPage
                            title={app.name}
                            onBack={closeApp}
                            enableEnterAnimation={false}
                        >
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <span className="text-4xl mb-2">🚧</span>
                                <p className="text-lg font-medium">{app.name} 正在开发中...</p>
                                <button onClick={closeApp} className="mt-4 px-4 py-2 bg-white rounded-full shadow-sm text-sm active:scale-95 transition-transform">
                                    返回桌面
                                </button>
                            </div>
                        </IOSPage>
                    )}

                    {/* 
                       Home Indicator 区域 
                       (注意：有些 App 可能自带底部栏，所以这个 Indicator 的层级要注意，
                        或者由各个 App 自己决定是否渲染。这里暂时作为全局兜底)
                    */}
                    <div className="fixed bottom-1 left-0 w-full h-5 flex justify-center items-end z-[100] pointer-events-none">
                        <div className="w-[130px] h-[5px] bg-black/20 rounded-full" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AppWindow;
