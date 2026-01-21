import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing } from 'lucide-react';
import { appRegistry } from '../../../config/appRegistry';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { db } from '../../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import NotificationService from '../../../services/NotificationService';
import { triggerHaptic } from '../../../utils/haptics';

const MODE_LABELS = {
    'A': { label: '立即 (A)', desc: '实时响应', color: 'bg-green-100 text-green-700' },
    'B': { label: '静默 (B)', desc: '打包发送', color: 'bg-blue-100 text-blue-700' },
    'C': { label: '隐私 (C)', desc: '仅存本地', color: 'bg-gray-100 text-gray-600' },
};

const AppItem = ({ app }) => {
    // 实时读取数据库配置 (User Overrides)
    const userMode = useLiveQuery(() => db.settings.get(`mode_${app.id}`));
    const userNotify = useLiveQuery(() => db.notificationSettings.get(app.id));

    // 计算最终状态 (DB > Default)
    const mode = userMode?.value || app.transmissionMode || 'A';
    const notify = userNotify ? userNotify.enabled : (app.notificationEnabled ?? true);

    const [expanded, setExpanded] = useState(false);

    // 保存模式
    const handleSetMode = async (newMode) => {
        await db.settings.put({ key: `mode_${app.id}`, value: newMode });
    };

    // 保存通知开关
    const handleSetNotify = async (newState) => {
        await db.notificationSettings.put({ appId: app.id, enabled: newState });
    };

    return (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-50/50 dark:border-white/5 overflow-hidden transition-colors duration-300">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#2C2C2E] flex items-center justify-center text-lg shadow-inner overflow-hidden">
                        {(() => {
                            if (typeof app.icon === 'string' && app.icon.includes('/')) {
                                return <img src={app.icon} className="w-full h-full object-cover" />;
                            }
                            if (typeof app.icon === 'function' || typeof app.icon === 'object') {
                                const IconComp = app.icon;
                                return <IconComp size={20} className="text-gray-500 dark:text-gray-400" />;
                            }
                            return <span className="dark:text-white">{app.name[0]}</span>;
                        })()}
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{app.name}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${MODE_LABELS[mode].color} bg-opacity-20 dark:bg-opacity-30`}>
                            {MODE_LABELS[mode].desc}
                        </span>
                    </div>
                </div>
                <div className={`transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
            </div>

            {/* 展开的详情设置 */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2C2C2E] space-y-4 text-left overflow-hidden"
                    >
                        {/* 通讯模式选择 */}
                        <div>
                            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">通讯模式 (Transmission)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(MODE_LABELS).map(([key, info]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleSetMode(key)}
                                        className={`py-2 rounded-lg text-xs font-medium transition-all border ${mode === key ? 'border-transparent ring-2 ring-offset-1 dark:ring-offset-[#1C1C1E] ' + info.color.replace('text', 'ring') : 'bg-white dark:bg-[#2C2C2E] border-gray-200 dark:border-transparent text-gray-500 dark:text-gray-400'}`}
                                        style={mode === key ? {} : {}}
                                    >
                                        {info.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 通知开关 */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">允许通知</label>
                            <button
                                onClick={() => handleSetNotify(!notify)}
                                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${notify ? 'bg-green-500' : 'bg-gray-200 dark:bg-[#3A3A3C]'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notify ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AppsPage = ({ onBack }) => {
    return (
        <IOSPage title="应用管理" onBack={onBack}>
            <div className="p-5 space-y-3 pb-24">
                <p className="text-xs text-gray-400 dark:text-gray-600 px-1 mb-2">配置每个 App 的 AI 连接权限(通讯模式)与通知权限。</p>
                {Object.values(appRegistry).filter(app => app.id !== 'settings').map(app => (
                    <AppItem key={app.id} app={app} />
                ))}

                {/* Notification Test Section */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">通知测试</p>

                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm space-y-3">
                        <button
                            onClick={() => {
                                triggerHaptic();
                                NotificationService.send('HoshinoOS 即时通知', {
                                    body: '这是一条测试消息，点击查看详情 💬',
                                    tag: 'test-instant'
                                });
                            }}
                            className="w-full py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-green-500/20"
                        >
                            <Bell size={18} /> 测试即时弹窗
                        </button>

                        <button
                            onClick={() => {
                                triggerHaptic();
                                alert('通知将在 5 秒后弹出，可以锁屏等待！');
                                NotificationService.schedule('HoshinoOS 延迟通知', {
                                    body: '这是 5 秒后的锁屏通知测试 🔔',
                                    tag: 'test-delayed'
                                }, 5000);
                            }}
                            className="w-full py-3 bg-gradient-to-r from-purple-400 to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-purple-500/20"
                        >
                            <BellRing size={18} /> 测试 5s 后锁屏弹窗
                        </button>

                        <p className="text-[11px] text-gray-400 text-center">
                            首次测试需授权通知权限，锁屏弹窗需在 PWA 模式下测试
                        </p>
                    </div>
                </div>
            </div>
        </IOSPage>
    );
};

export default AppsPage;
