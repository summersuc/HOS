import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import IOSPage from '../../components/AppWindow/IOSPage';
import { HeartbeatProvider, useHeartbeat } from './data/HeartbeatContext';
import LoverList from './pages/LoverList';
import LoverEditor from './pages/LoverEditor';
import StoryScene from './pages/StoryScene';
import HeartbeatSettings from './pages/HeartbeatSettings';
import './styles/Heartbeat.css';

/**
 * 心动 App 内部路由
 * 主页面全屏沉浸式背景，无顶栏
 */
const HeartbeatContent = ({ onClose }) => {
    const {
        currentPage,
        setCurrentPage,
        currentLoverId,
        currentLover,
    } = useHeartbeat();

    // 返回逻辑
    const handleBack = () => {
        switch (currentPage) {
            case 'editor':
            case 'story':
                setCurrentPage('list');
                break;
            case 'settings':
                setCurrentPage('story');
                break;
            default:
                onClose();
        }
    };

    return (
        <div className="w-full h-full relative overflow-hidden">
            {/* 1. 主列表层 - 全屏无顶栏 */}
            <IOSPage
                title={null}
                onBack={onClose}
                enableEnterAnimation={false}
                className="hb-main-bg"
            >
                <LoverList onClose={onClose} />
            </IOSPage>

            {/* 2. 编辑器层 */}
            <AnimatePresence>
                {currentPage === 'editor' && (
                    <IOSPage
                        title={currentLoverId ? '编辑恋人' : '创建新恋人'}
                        onBack={handleBack}
                        className="hb-main-bg"
                        rightButton={
                            <button
                                className="px-3 py-1.5 text-[16px] font-semibold text-[#FF6B8A]"
                                onClick={() => {
                                    // 触发LoverEditor的保存
                                    document.getElementById('hb-save-trigger')?.click();
                                }}
                            >
                                保存
                            </button>
                        }
                    >
                        <div className="heartbeat-app">
                            <LoverEditor />
                        </div>
                    </IOSPage>
                )}
            </AnimatePresence>

            {/* 3. 故事场景层 */}
            <AnimatePresence>
                {currentPage === 'story' && (
                    <IOSPage
                        title={currentLover?.name || '心动'}
                        onBack={handleBack}
                        className="hb-main-bg"
                        rightButton={
                            <button
                                className="p-2 text-gray-600 dark:text-gray-400 active:opacity-50 transition-opacity"
                                onClick={() => setCurrentPage('settings')}
                            >
                                <Settings size={20} />
                            </button>
                        }
                    >
                        <div className="heartbeat-app">
                            <StoryScene />
                        </div>
                    </IOSPage>
                )}
            </AnimatePresence>

            {/* 4. 设置层 */}
            <AnimatePresence>
                {currentPage === 'settings' && (
                    <IOSPage
                        title="心动设置"
                        onBack={handleBack}
                        className="hb-main-bg"
                        rightButton={
                            <button
                                className="px-3 py-1.5 text-[16px] font-semibold text-[#FF6B8A]"
                                onClick={handleBack}
                            >
                                保存
                            </button>
                        }
                    >
                        <div className="heartbeat-app">
                            <HeartbeatSettings />
                        </div>
                    </IOSPage>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * 心动 App 入口
 */
const Heartbeat = ({ onClose }) => {
    return (
        <HeartbeatProvider>
            <HeartbeatContent onClose={onClose} />
        </HeartbeatProvider>
    );
};

export default Heartbeat;
