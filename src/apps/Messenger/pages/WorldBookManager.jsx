import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Book, Globe, User, ArrowDown } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { triggerHaptic } from '../../../utils/haptics';
import { AnimatePresence } from 'framer-motion';

// Separate Editor Component for cleanliness
const WorldBookManager = ({ onBack, onEdit, onNew }) => {
    const entries = useLiveQuery(() => db.worldBookEntries.toArray());
    const characters = useLiveQuery(() => db.characters.toArray());

    const rightButton = (
        <button onClick={onNew} className="w-8 h-8 flex items-center justify-center rounded-full bg-transparent active:scale-95 transition-transform">
            <Plus size={24} className="text-gray-400 dark:text-gray-500" />
        </button>
    );

    return (
        <IOSPage title="世界书" onBack={onBack} rightButton={rightButton}>
            <div className="p-4 space-y-3 pb-24 bg-[#F2F2F7] dark:bg-black min-h-full">
                {entries?.map(entry => {
                    const charName = entry.characterId ? characters?.find(c => c.id === entry.characterId)?.name : null;

                    return (
                        <div key={entry.id} onClick={() => onEdit(entry)} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 cursor-pointer shadow-sm border border-gray-200/50 dark:border-white/5 active:scale-[0.98] transition-transform">
                            <div className="flex justify-between items-start mb-2">
                                <div className="space-y-1">
                                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {entry.title || '无标题'}
                                        {entry.isGlobal ? (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-md font-bold">
                                                <Globe size={10} />
                                                GLOBAL
                                            </div>
                                        ) : charName && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] rounded-md font-bold">
                                                <User size={10} />
                                                {charName}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {entry.keys?.split(',').map(k => k.trim() && (
                                            <span key={k} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-[#5B7FFF] text-[12px] rounded-md font-medium">
                                                {k.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${entry.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </div>
                            <p className="text-[14px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed font-mono bg-gray-50 dark:bg-black/20 p-2 rounded-lg mt-2">
                                {entry.content}
                            </p>
                        </div>
                    );
                })}

                {(!entries || entries.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Book size={48} className="text-gray-200 mb-4" />
                        <p>添加关键词和设定，让 AI 更懂世界观</p>
                    </div>
                )}
            </div>
        </IOSPage>
    );
};

export default WorldBookManager;
