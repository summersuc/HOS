import React from 'react';
import { Search, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import Avatar from '../components/Avatar';

const ChatListTab = ({ onSelectChat, onShowNewMenu }) => {
    const conversations = useLiveQuery(() =>
        db.conversations.orderBy('updatedAt').reverse().toArray()
    );
    const characters = useLiveQuery(() => db.characters.toArray());

    const getCharacter = (id) => characters?.find(c => c.id === id);

    return (
        <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-black">
            {/* Header */}
            <div className="shrink-0 pt-[var(--sat)] bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/5">
                <div className="h-[56px] flex items-center justify-between px-4">
                    <h1 className="text-[28px] font-bold text-gray-900 dark:text-white tracking-tight">消息</h1>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic();
                            onShowNewMenu();
                        }}
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2E] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                    >
                        <Plus size={20} className="text-[#5B7FFF]" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="shrink-0 px-4 py-2 bg-[#F2F2F7] dark:bg-black">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜索"
                        className="w-full bg-white dark:bg-[#1C1C1E] rounded-xl py-2 pl-9 pr-4 text-[15px] focus:outline-none text-gray-800 dark:text-white placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Conversation List - iOS Style */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1C1C1E]">
                {conversations && conversations.length > 0 ? (
                    conversations.map((conv) => {
                        const char = getCharacter(conv.characterId);
                        return (
                            <div
                                key={conv.id}
                                onClick={() => { triggerHaptic(); onSelectChat(conv.id, conv.characterId); }}
                                className="flex items-center gap-3 pl-4 pr-4 py-3 cursor-pointer active:bg-gray-100 dark:active:bg-[#2C2C2E] transition-colors"
                            >
                                {/* Avatar */}
                                <Avatar src={char?.avatar} name={char?.name} size={50} />

                                {/* Content */}
                                <div className="flex-1 min-w-0 h-[50px] flex flex-col justify-center border-b border-gray-100 dark:border-white/5 mr-[-16px] pr-4">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-semibold text-[16px] text-gray-900 dark:text-white truncate">
                                            {char?.nickname || char?.name || '未知'}
                                        </h3>
                                        <span className="text-[11px] text-gray-400 shrink-0 ml-2 font-medium">
                                            {formatTime(conv.updatedAt)}
                                        </span>
                                    </div>
                                    <p className="text-[14px] text-gray-500 dark:text-gray-400 truncate">
                                        点击查看消息
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center pt-32 text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#2C2C2E] flex items-center justify-center mb-4">
                            <Plus size={28} className="text-gray-300" />
                        </div>
                        <p className="text-[15px] font-medium text-gray-500">暂无消息</p>
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
