import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Edit3, ChevronLeft } from 'lucide-react';
import IOSPage from '../../components/AppWindow/IOSPage';
import { HeartbeatProvider, useHeartbeat } from './data/HeartbeatContext';
import LoverList from './pages/LoverList';
import LoverEditor from './pages/LoverEditor';
import StoryScene from './pages/StoryScene';
import HeartbeatSettings from './pages/HeartbeatSettings';
import CharacterProfile from './pages/CharacterProfile';
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
        setCurrentLoverId,
        currentLover,
        importFromMessenger,
        lovers,
        deleteLover,
        clearAllLovers,
        stories,
        settings,
        setSettings,
        isTyping,
        setIsTyping,
        addStory,
        switchScene,
        adjustIntimacy,
        deleteStoriesAfter,
        updateLover,
        createLover,
    } = useHeartbeat();

    // 返回逻辑
    const handleBack = () => {
        switch (currentPage) {
            case 'editor':
            case 'story':
            case 'profile':
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
            {/* 1. 主列表层 - 全屏无顶栏，支持侧滑返回 */}
            <motion.div
                className="absolute inset-0 z-10"
                animate={{ scale: 1, opacity: 1 }}
            >
                <IOSPage
                    title={null}
                    onBack={onClose}
                    enableEnterAnimation={false}
                    className="hb-main-bg"
                    showBackButton={false}
                >
                    <LoverList
                        onClose={onClose}
                        lovers={lovers}
                        setCurrentLoverId={setCurrentLoverId}
                        setCurrentPage={setCurrentPage}
                        deleteLover={deleteLover}
                        clearAllLovers={clearAllLovers}
                    />
                </IOSPage>
            </motion.div>

            {/* 2. 角色人设预览层 */}
            <AnimatePresence>
                {currentPage === 'profile' && (
                    <IOSPage
                        title={currentLover?.name || '角色介绍'}
                        onBack={handleBack}
                        className="hb-page-layer"
                    >
                        <div className="heartbeat-app">
                            <CharacterProfile
                                currentLover={currentLover}
                                setCurrentPage={setCurrentPage}
                                setCurrentLoverId={setCurrentLoverId}
                                importFromMessenger={importFromMessenger}
                            />
                        </div>
                    </IOSPage>
                )}
            </AnimatePresence>

            {/* 3. 编辑器层 */}
            <AnimatePresence>
                {currentPage === 'editor' && (
                    <IOSPage
                        title={currentLoverId ? '编辑恋人' : '创建新恋人'}
                        onBack={handleBack}
                        className="hb-page-layer"
                        rightButton={
                            <button
                                className="px-3 py-1.5 text-[16px] font-semibold text-[#FF6B8A]"
                                onClick={() => {
                                    document.getElementById('hb-save-trigger')?.click();
                                }}
                            >
                                保存
                            </button>
                        }
                    >
                        <div className="heartbeat-app">
                            <LoverEditor
                                currentLoverId={currentLoverId}
                                currentLover={currentLover}
                                setCurrentPage={setCurrentPage}
                                createLover={createLover}
                                updateLover={updateLover}
                                deleteLover={deleteLover}
                            />
                        </div>
                    </IOSPage>
                )}
            </AnimatePresence>

            {/* 4. 故事场景层 */}
            {/* 4. 故事场景层 */}
            <AnimatePresence>
                {(currentPage === 'story' || currentPage === 'settings') && (
                    <IOSPage
                        key="story-scene-flow"
                        title={currentLover?.name || '心动'}
                        onBack={handleBack}
                        className="hb-page-layer"
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
                            <StoryScene
                                currentLover={currentLover}
                                currentLoverId={currentLoverId}
                                stories={stories}
                                settings={settings}
                                isTyping={isTyping}
                                setIsTyping={setIsTyping}
                                setCurrentPage={setCurrentPage}
                                addStory={addStory}
                                switchScene={switchScene}
                                adjustIntimacy={adjustIntimacy}
                                deleteStoriesAfter={deleteStoriesAfter}
                            />
                        </div>
                    </IOSPage>
                )}
            </AnimatePresence>

            {/* 5. 设置层 */}
            <AnimatePresence>
                {currentPage === 'settings' && (
                    <IOSPage
                        key="heartbeat-settings"
                        title="心动设置"
                        onBack={handleBack}
                        className="hb-page-layer"
                        backIcon={<ChevronLeft size={24} />}
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
                            <HeartbeatSettings
                                settings={settings}
                                setSettings={setSettings}
                                currentLover={currentLover}
                                currentLoverId={currentLoverId}
                                updateLover={updateLover}
                                setCurrentPage={setCurrentPage}
                            />
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
