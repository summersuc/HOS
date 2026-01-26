import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import Avatar from '../../Messenger/components/Avatar';
import { triggerHaptic } from '../../../utils/haptics';

const ContactSelectorSheet = ({ onClose, onSelect }) => {
    // Exact same query logic as Messenger/ChatListTab to ensure consistency
    const conversations = useLiveQuery(() =>
        db.conversations.orderBy('updatedAt').reverse().toArray()
    );
    const characters = useLiveQuery(() => db.characters.toArray());

    const getCharacter = (id) => characters?.find(c => c.id === id);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full h-[70vh] bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shrink-0 h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-md border-b border-gray-200/50 dark:border-white/5">
                    <span className="text-[18px] font-bold text-gray-900 dark:text-white">选择一起听的好友</span>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/50 dark:bg-white/10 active:scale-90 transition-transform"
                    >
                        <X size={18} className="text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {conversations && conversations.length > 0 ? (
                        conversations.map((conv) => {
                            const char = getCharacter(conv.characterId);
                            return (
                                <motion.button
                                    key={conv.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHaptic();
                                        onSelect(conv.id);
                                    }}
                                    className="w-full flex items-center gap-4 p-3 bg-white dark:bg-[#2C2C2E] rounded-2xl active:scale-[0.98] transition-all border border-transparent dark:border-white/5"
                                >
                                    <div className="relative">
                                        <Avatar
                                            src={char?.avatar}
                                            name={char?.name}
                                            size={48}
                                            className="rounded-xl"
                                        />
                                        {char?.currentStatus && (
                                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#2C2C2E] rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">
                                            {char?.nickname || char?.name || '未知联系人'}
                                        </h3>
                                        <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                                            {char?.signature || '点击邀请一起听'}
                                        </p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                                    </div>
                                </motion.button>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
                            <span className="text-sm">暂无联系人</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ContactSelectorSheet;
