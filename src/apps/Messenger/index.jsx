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
import WorldBookEditor from './pages/WorldBookEditor';

const TABS = [
    { id: 'chat', label: '消息', icon: MessageSquare },
    { id: 'contacts', label: '通讯录', icon: Users },
    { id: 'discover', label: '发现', icon: Compass },
    { id: 'me', label: '我', icon: User },
];

import { storageService } from '../../services/StorageService';
import { llmService } from '../../services/LLMService';
import NotificationService from '../../services/NotificationService';

const Messenger = ({ onClose, initialParams }) => {
    const [activeTab, setActiveTab] = useState('chat');
    const [currentPage, setCurrentPage] = useState(null);
    const [pageStack, setPageStack] = useState([]);
    const [showNewMenu, setShowNewMenu] = useState(false);
    const [pickerMode, setPickerMode] = useState(null);

    React.useEffect(() => {
        storageService.preloadTable('userPersonas');
        storageService.preloadTable('characters');
        storageService.preloadTable('blobs', 'data');
        storageService.preloadTable('chatWallpapers', 'data');

        // Listen for Cross-App Share Events
        const handleShare = (e) => {
            const { targetApp, action, data, targetId } = e.detail;
            if (targetApp === 'messenger' && action === 'share-music') {
                // Ensure we are on the Chat tab
                setActiveTab('chat');
                // Open the specific conversation
                // We pass 'initialAttachment' to ChatDetail
                // Note: We need to modify openPage/ChatDetail to accept this
                // Construct a special page object or pass via state

                // Let's pass it as a prop 'extraProps' or similar if openPage supports it, 
                // or just modify openPage to take extra data.

                // My openPage logic: setCurrentPage(page). Page is object { type, id... }
                // I can add arbitrary data to this page object.

                // First, find characterId if only convId is passed (optional, ChatDetail handles safeCid)
                // But ChatDetail needs characterId for some logic? 
                // Actually ChatDetail takes conversationId and characterId.
                // We have targetId which is conversationId (convId).
                // We should try to find the characterId associated if possible, or let ChatDetail handle it.
                // However, openPage usually expects { type: 'chat', id: convId, characterId: ... }

                db.conversations.get(targetId).then(conv => {
                    if (conv) {
                        openPage({
                            type: 'chat',
                            id: targetId,
                            characterId: conv.characterId,
                            initialAttachment: {
                                type: 'music_card',
                                data: data
                            }
                        }, false); // Don't push to stack if jumping? Or yes? Maybe false to reset context.
                    }
                });
            }
        };

        window.addEventListener('suki-app-share', handleShare);

        // Check for initial params (Launch from another app)
        if (initialParams && initialParams.action === 'share-music') {
            handleShare({ detail: { ...initialParams, targetApp: 'messenger' } });
        }

        return () => window.removeEventListener('suki-app-share', handleShare);
    }, [initialParams]);

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
            {/* 1. Main View Layer (List) - Always Bottom (z-10) */}
            <motion.div className="absolute inset-0 z-10">
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

                        <div className="shrink-0 px-4 pb-[var(--sab)] pt-2">
                            <div className="bg-white/50 dark:bg-[#1C1C1E]/50 backdrop-blur-2xl rounded-full border border-gray-200/30 dark:border-white/10 shadow-lg">
                                <div className="flex justify-around items-center h-[50px]">
                                    {TABS.map(tab => {
                                        const isActive = activeTab === tab.id;
                                        const Icon = tab.icon;
                                        return (
                                            <motion.button
                                                key={tab.id}
                                                onClick={() => handleTabChange(tab.id)}
                                                whileTap={{ scale: 0.85 }}
                                                className={`flex flex-col items-center justify-center gap-0.5 px-5 py-1.5 transition-all duration-200 ${isActive ? '' : 'opacity-40'}`}
                                            >
                                                <Icon
                                                    size={22}
                                                    strokeWidth={2}
                                                    fill={isActive ? 'currentColor' : 'none'}
                                                    className={isActive ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}
                                                />
                                                <span className={`text-[10px] font-medium ${isActive ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`}>
                                                    {tab.label}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </IOSPage>
            </motion.div>

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
                                initialAttachment={page.initialAttachment}
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
                    if (page.type === 'worldbook') {
                        return (
                            <WorldBookManager
                                key={pageKey}
                                onBack={closePage}
                                onNew={() => openPage({ type: 'worldbook_editor', entry: null }, true)}
                                onEdit={(entry) => openPage({ type: 'worldbook_editor', entry: entry }, true)}
                            />
                        );
                    }
                    if (page.type === 'worldbook_editor') {
                        return (
                            <WorldBookEditor
                                key={pageKey}
                                entry={page.entry}
                                onBack={closePage}
                                onSave={async (entry) => {
                                    if (entry.id) await db.worldBookEntries.update(entry.id, entry);
                                    else await db.worldBookEntries.add({ ...entry, enabled: true });
                                    closePage();
                                }}
                                onDelete={async (id) => {
                                    if (confirm('删除此词条?')) {
                                        await db.worldBookEntries.delete(id);
                                        closePage();
                                    }
                                }}
                            />
                        );
                    }
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
