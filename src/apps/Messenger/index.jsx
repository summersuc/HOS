import React, { useState } from 'react'; // HMR Force Update
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Users, Compass, User, UserPlus, MessageCircle, MoreVertical } from 'lucide-react';
import { db } from '../../db/schema';
import IOSPage from '../../components/AppWindow/IOSPage';

// Tab 内容组件
import ChatListTab from './tabs/ChatListTab';
import ContactsTab from './tabs/ContactsTab';
import DiscoverTab from './tabs/DiscoverTab';
import MeTab from './tabs/MeTab';

// 详情页组件
import ChatDetail from './pages/ChatDetail';
import CharacterEditor from './pages/CharacterEditor';
import CharacterProfile from './pages/CharacterProfile';
import WorldBookManager from './pages/WorldBookManager';
import PersonaEditor from './pages/PersonaEditor';
import PresetsManager from './pages/PresetsManager';
import ContactPicker from './components/ContactPicker';
import APISettings from '../Settings/pages/APIPage';
import BeautifyEditor from './pages/BeautifyEditor';
import ChatSettingsPage from './pages/ChatSettingsPage';

const TABS = [
    { id: 'chat', label: '消息', icon: MessageSquare },
    { id: 'contacts', label: '通讯录', icon: Users },
    { id: 'discover', label: '发现', icon: Compass },
    { id: 'me', label: '我', icon: User },
];

const Messenger = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('chat');
    const [currentPage, setCurrentPage] = useState(null);
    const [pageStack, setPageStack] = useState([]);
    const [showNewMenu, setShowNewMenu] = useState(false);
    const [pickerMode, setPickerMode] = useState(null);

    const openPage = (page, pushToStack = true) => {
        if (pushToStack && currentPage) {
            setPageStack(prev => [...prev, currentPage]);
        }
        setCurrentPage(page);
    };

    const closePage = () => {
        if (pageStack.length > 0) {
            const prevPage = pageStack[pageStack.length - 1];
            setPageStack(prev => prev.slice(0, -1));
            setCurrentPage(prevPage);
        } else {
            setCurrentPage(null);
        }
    };

    const closeAllPages = () => {
        setPageStack([]);
        setCurrentPage(null);
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        closeAllPages();
    };

    // Logic for new chat/group
    const handlePickerSelect = async (result) => {
        if (pickerMode === 'newChat') {
            const existing = await db.conversations.where({ characterId: result }).first();
            let convId;
            if (existing) {
                convId = existing.id;
            } else {
                const char = await db.characters.get(result);
                convId = await db.conversations.add({ characterId: result, title: char.name, updatedAt: Date.now() });
            }
            setPickerMode(null);
            openPage({ type: 'chat', id: convId, characterId: result }, false);
        } else if (pickerMode === 'newGroup') {
            alert('群聊功能开发中\n选择了: ' + result.length + ' 个联系人');
            setPickerMode(null);
        }
    };

    return (
        <div className="w-full h-full relative bg-transparent overflow-hidden">
            {/* 主视图层 */}
            <IOSPage title={null} onBack={onClose} enableEnterAnimation={false}>
                <div className="absolute inset-0 flex flex-col bg-[#F2F2F7] dark:bg-black">
                    <div className="flex-1 overflow-hidden relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="absolute inset-0"
                            >
                                {activeTab === 'chat' && (
                                    <ChatListTab
                                        onSelectChat={(convId, charId) => openPage({ type: 'chat', id: convId, characterId: charId }, false)}
                                        onShowNewMenu={() => setShowNewMenu(true)}
                                    />
                                )}
                                {activeTab === 'contacts' && (
                                    <ContactsTab
                                        onSelectCharacter={(charId) => openPage({ type: 'profile', id: charId }, false)}
                                        onNewCharacter={() => openPage({ type: 'character', id: null }, false)}
                                    />
                                )}
                                {activeTab === 'discover' && (
                                    <DiscoverTab
                                        onOpenWorldBook={() => openPage({ type: 'worldbook' }, false)}
                                        onOpenPresets={() => openPage({ type: 'presets' }, false)}
                                    />
                                )}
                                {activeTab === 'me' && (
                                    <MeTab
                                        onEditPersona={(personaId) => openPage({ type: 'persona', id: personaId }, false)}
                                        onNewPersona={() => openPage({ type: 'persona', id: null }, false)}
                                        onOpenSettings={() => openPage({ type: 'settings' }, false)}
                                        onOpenBeautify={() => openPage({ type: 'beautify' }, false)}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="shrink-0 bg-[#F2F2F7]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/5 pb-[var(--sab)]">
                        <div className="flex justify-around items-center h-[52px]">
                            {TABS.map(tab => {
                                const isActive = activeTab === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`flex flex-col items-center justify-center gap-1 px-5 py-1.5 transition-all duration-200 ${isActive ? '' : 'opacity-50'}`}
                                    >
                                        <Icon
                                            size={24}
                                            strokeWidth={isActive ? 2.5 : 1.8}
                                            className={isActive ? 'text-[#5B7FFF]' : 'text-gray-500 dark:text-gray-400'}
                                        />
                                        <span className={`text-[10px] font-semibold ${isActive ? 'text-[#5B7FFF]' : 'text-gray-400'}`}>
                                            {tab.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </IOSPage>

            {/* 新建菜单弹窗 */}
            <AnimatePresence>
                {showNewMenu && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 z-40"
                        onClick={() => setShowNewMenu(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                            className="absolute top-[calc(var(--sat)+50px)] right-4 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xl overflow-hidden min-w-[160px]"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => { setShowNewMenu(false); openPage({ type: 'character', id: null }, false); }}
                                className="w-full px-4 py-3 flex items-center gap-3 active:bg-gray-100 dark:active:bg-white/10"
                            >
                                <UserPlus size={18} className="text-gray-900 dark:text-white" />
                                <span className="text-[15px] text-gray-900 dark:text-white">添加联系人</span>
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-white/5 mx-4" />
                            <button
                                onClick={() => { setShowNewMenu(false); setPickerMode('newChat'); }}
                                className="w-full px-4 py-3 flex items-center gap-3 active:bg-gray-100 dark:active:bg-white/10"
                            >
                                <MessageCircle size={18} className="text-gray-900 dark:text-white" />
                                <span className="text-[15px] text-gray-900 dark:text-white">发起聊天</span>
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-white/5 mx-4" />
                            <button
                                onClick={() => { setShowNewMenu(false); setPickerMode('newGroup'); }}
                                className="w-full px-4 py-3 flex items-center gap-3 active:bg-gray-100 dark:active:bg-white/10"
                            >
                                <Users size={18} className="text-gray-900 dark:text-white" />
                                <span className="text-[15px] text-gray-900 dark:text-white">发起群聊</span>
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Picker Layer */}
            <AnimatePresence>
                {pickerMode && (
                    <div className="absolute inset-0 z-50 bg-[#F2F2F7] dark:bg-black">
                        <ContactPicker
                            mode={pickerMode === 'newChat' ? 'single' : 'multi'}
                            title={pickerMode === 'newChat' ? '选择联系人' : '发起群聊'}
                            onSelect={handlePickerSelect}
                            onCancel={() => setPickerMode(null)}
                        />
                    </div>
                )}
            </AnimatePresence>


            {/* Render All Pages (Stack + Current) Unified */}


            <AnimatePresence>
                {[...pageStack, currentPage].filter(Boolean).map((page, index) => {
                    const pageKey = `${page.type}-${page.id || page.conversationId || 'new'}-${index}`;

                    if (page.type === 'chat') {
                        // Ensure conversationId is valid
                        const cId = page.id ?? page.conversationId;
                        return (
                            <ChatDetail
                                key={pageKey}
                                conversationId={cId}
                                characterId={page.characterId}
                                onBack={closePage}
                                onProfile={(charId) => openPage({ type: 'profile', id: charId }, true)}
                                onSettings={(convId, charId) => openPage({ type: 'chatSettings', conversationId: convId, characterId: charId }, true)}
                            />
                        );
                    }
                    if (page.type === 'chatSettings') {
                        return (
                            <ChatSettingsPage
                                key={pageKey}
                                conversationId={page.conversationId}
                                characterId={page.characterId}
                                onBack={closePage}
                                onProfile={(charId) => openPage({ type: 'profile', id: charId }, true)}
                            />
                        );
                    }
                    if (page.type === 'profile') {
                        return (
                            <CharacterProfile
                                key={pageKey}
                                characterId={page.id}
                                onBack={closePage}
                                onEdit={() => openPage({ type: 'character', id: page.id }, true)}
                                onMessage={async () => {
                                    const existing = await db.conversations.where({ characterId: page.id }).first();
                                    if (existing) {
                                        openPage({ type: 'chat', id: existing.id, characterId: page.id }, true);
                                    } else {
                                        const char = await db.characters.get(page.id);
                                        const convId = await db.conversations.add({ characterId: page.id, title: char.name, updatedAt: Date.now() });
                                        openPage({ type: 'chat', id: convId, characterId: page.id }, true);
                                    }
                                }}
                            />
                        );
                    }
                    if (page.type === 'character') {
                        return (
                            <CharacterEditor
                                key={pageKey}
                                characterId={page.id}
                                onBack={closePage}
                                onStartChat={(convId, charId) => {
                                    closeAllPages();
                                    setTimeout(() => openPage({ type: 'chat', id: convId, characterId: charId }, false), 50);
                                }}
                            />
                        );
                    }
                    if (page.type === 'worldbook') return <WorldBookManager key={pageKey} onBack={closePage} />;
                    if (page.type === 'presets') return <PresetsManager key={pageKey} onBack={closePage} />;
                    if (page.type === 'persona') {
                        return (
                            <PersonaEditor
                                key={pageKey}
                                personaId={page.id}
                                onBack={closePage}
                            />
                        );
                    }
                    if (page.type === 'settings') return <APISettings key={pageKey} onBack={closePage} />;
                    if (page.type === 'beautify') return <BeautifyEditor key={pageKey} onBack={closePage} />;
                    return null;
                })}
            </AnimatePresence>
        </div>
    );
};

export default Messenger;
