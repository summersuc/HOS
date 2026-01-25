import React, { useMemo, useState, useEffect } from 'react';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import Avatar from '../components/Avatar';
import { motion } from 'framer-motion';

const ChatListTab = ({ onSelectChat, onShowNewMenu }) => {
    const conversations = useLiveQuery(() =>
        db.conversations.orderBy('updatedAt').reverse().toArray()
    );
    const characters = useLiveQuery(() => db.characters.toArray());

    // Fetch last message for each conversation
    const [lastMessages, setLastMessages] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});

    useEffect(() => {
        const fetchLastMessages = async () => {
            if (!conversations) return;
            const messages = {};
            const unreads = {};

            for (const conv of conversations) {
                try {
                    // Get last message
                    const lastMsg = await db.messengerMessages
                        .where('[conversationType+conversationId]')
                        .equals(['single', conv.id])
                        .reverse()
                        .first();

                    if (lastMsg) {
                        messages[conv.id] = lastMsg.content?.slice(0, 50) || '';
                    }

                    // Get unread count (messages after lastReadAt)
                    const lastReadAt = conv.lastReadAt || 0;
                    const unreadCount = await db.messengerMessages
                        .where('[conversationType+conversationId]')
                        .equals(['single', conv.id])
                        .filter(m => m.timestamp > lastReadAt && m.role !== 'user')
                        .count();

                    unreads[conv.id] = unreadCount;
                } catch (e) {
                    console.warn('Failed to fetch last message for conv:', conv.id, e);
                }
            }

            setLastMessages(messages);
            setUnreadCounts(unreads);
        };

        fetchLastMessages();
    }, [conversations]);

    const getCharacter = (id) => characters?.find(c => c.id === id);

    const formatUnread = (count) => {
        if (!count || count === 0) return null;
        if (count > 99) return '99+';
        return String(count);
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg-primary-light)] dark:bg-[var(--bg-primary-dark)] transition-colors duration-300">
            {/* Header - V3 Soft Gradient Blur */}
            <div className="shrink-0 relative z-30">
                <div
                    className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, var(--bg-primary-light) 0%, transparent 100%)', // Use CSS var for theme
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                    }}
                />
                {/* Note: Dark mode background handling might need explicit darker color if var not reliable for RGBA logic. 
                    Let's use a simpler bg-white approach for now matching others? 
                    Actually Tabs used var(--bg-primary-light) before. 
                    Let's revert to white/black for glass effect to be consistent.
                */}
                <div
                    className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                    }}
                />

                <div className="relative pt-[var(--sat)] h-[calc(56px+var(--sat))] flex items-center justify-between px-5">
                    <h1 className="text-[32px] font-bold text-gray-900 dark:text-gray-200 tracking-tight">消息</h1>
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic();
                            onShowNewMenu();
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center"
                    >
                        <Plus size={26} className="text-gray-400 dark:text-gray-500" strokeWidth={2.5} />
                    </motion.button>
                </div>
            </div>

            {/* Search - Compact */}
            <div className="shrink-0 px-4 py-2 bg-transparent z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="搜索"
                        className="w-full bg-white/50 dark:bg-[#1C1C1E]/50 backdrop-blur-xl rounded-xl py-2 pl-9 pr-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300/50 text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200/30 dark:border-white/8 transition-all duration-200"
                    />
                </div>
            </div>

            {/* Conversation List - Premium Style */}
            <div className="flex-1 overflow-y-auto mx-4 mt-2 mb-4 pb-[var(--sab)] no-scrollbar">
                {conversations && conversations.length > 0 ? (
                    <div className="bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-200/50 dark:border-white/8 shadow-md transition-colors duration-300">
                        {conversations.map((conv, index) => {
                            const char = getCharacter(conv.characterId);
                            const lastMsg = lastMessages[conv.id];
                            const unread = unreadCounts[conv.id] || 0;
                            const unreadLabel = formatUnread(unread);

                            return (
                                <motion.div
                                    key={conv.id}
                                    onClick={() => {
                                        triggerHaptic();
                                        // Mark as read when opening
                                        db.conversations.update(conv.id, { lastReadAt: Date.now() });
                                        onSelectChat(conv.id, conv.characterId);
                                    }}
                                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer active:bg-gray-100 dark:active:bg-white/10 transition-colors"
                                    style={{ borderBottom: index < conversations.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Avatar with Unread Badge */}
                                    <div className="relative shrink-0">
                                        <div className="w-[48px] h-[48px] rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 p-0.5">
                                            <Avatar
                                                src={char?.avatar}
                                                name={char?.name}
                                                size={48}
                                                className="rounded-xl"
                                            />
                                        </div>
                                        {/* Status Indicator */}
                                        {char?.currentStatus && (
                                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#1C1C1E] rounded-full" />
                                        )}
                                        {/* Unread Badge */}
                                        {unreadLabel && (
                                            <div className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center px-1.5 shadow-lg shadow-red-500/40 border-2 border-white dark:border-[#1C1C1E]">
                                                <span className="text-[11px] font-bold text-white">{unreadLabel}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`font-semibold text-[16px] truncate ${unread > 0 ? 'text-[var(--text-primary-light)] dark:text-[var(--text-primary-dark)]' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {char?.nickname || char?.name || '未知'}
                                            </h3>
                                            <span className="text-[11px] text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] shrink-0 ml-2 font-medium">
                                                {formatTime(conv.updatedAt)}
                                            </span>
                                        </div>
                                        <p className={`text-[14px] truncate ${unread > 0 ? 'text-gray-600 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {lastMsg || '暂无消息'}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-32 text-gray-400">
                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <MessageCircle size={32} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-[15px] font-medium text-gray-500">暂无消息</p>
                        <p className="text-[13px] text-gray-400 mt-1">点击右上角开始新对话</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 86400000 * 2) return '昨天';
    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
};

export default ChatListTab;
