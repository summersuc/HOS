import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Book, Globe, User, ArrowDown } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { triggerHaptic } from '../../../utils/haptics';
import { AnimatePresence } from 'framer-motion';

// Separate Editor Component for cleanliness
const WorldBookEditor = ({ entry, onBack, onSave, onDelete, characters }) => {
    const [localEntry, setLocalEntry] = useState(entry);

    const handleSave = () => {
        onSave(localEntry);
    };

    const rightButton = (
        <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-[14px] font-semibold rounded-full shadow-md shadow-gray-400/20 active:scale-95 transition-transform"
        >
            保存
        </button>
    );

    return (
        <IOSPage
            title={localEntry.id ? '编辑词条' : '新建词条'}
            onBack={onBack}
            rightButton={rightButton}
            enableEnterAnimation={true} // Slide in check
        >
            <div className="p-4 space-y-5 pb-24 bg-[#F2F2F7] dark:bg-black min-h-full">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 space-y-4 shadow-sm border border-gray-200/50 dark:border-white/5">

                    {/* Title */}
                    <div>
                        <label className="text-[12px] font-medium text-gray-500 mb-2 block uppercase tracking-wide">标题 (标识用)</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#5B7FFF]/50 font-bold"
                            placeholder="例如: 世界观-魔法"
                            value={localEntry.title || ''}
                            onChange={e => setLocalEntry({ ...localEntry, title: e.target.value })}
                        />
                    </div>

                    {/* Scope */}
                    <div>
                        <label className="text-[12px] font-medium text-gray-500 mb-2 block uppercase tracking-wide">适用范围</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setLocalEntry({ ...localEntry, isGlobal: true, characterId: null })}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${localEntry.isGlobal
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'bg-white dark:bg-[#2C2C2E] border-gray-200 dark:border-white/5 text-gray-400'
                                    }`}
                            >
                                <Globe size={24} />
                                <span className="text-xs font-bold">全局通用</span>
                            </button>
                            <button
                                onClick={() => setLocalEntry({ ...localEntry, isGlobal: false, characterId: characters?.[0]?.id || null })}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${!localEntry.isGlobal
                                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-600 dark:text-orange-400'
                                    : 'bg-white dark:bg-[#2C2C2E] border-gray-200 dark:border-white/5 text-gray-400'
                                    }`}
                            >
                                <User size={24} />
                                <span className="text-xs font-bold">角色绑定</span>
                            </button>
                        </div>
                    </div>

                    {/* Character Selector */}
                    {!localEntry.isGlobal && (
                        <div>
                            <label className="text-[12px] font-medium text-gray-500 mb-2 block uppercase tracking-wide">选择角色</label>
                            <div className="relative">
                                <select
                                    value={localEntry.characterId || ''}
                                    onChange={e => setLocalEntry({ ...localEntry, characterId: parseInt(e.target.value) })}
                                    className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#5B7FFF]/50 appearance-none"
                                >
                                    {characters?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ArrowDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Triggers */}
                    <div>
                        <label className="text-[12px] font-medium text-gray-500 mb-2 block uppercase tracking-wide">触发关键词</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#5B7FFF]/50"
                            placeholder="例如: 魔法, 学院 (逗号分隔，留空则常驻)"
                            value={localEntry.keys}
                            onChange={e => setLocalEntry({ ...localEntry, keys: e.target.value })}
                        />
                        <p className="text-[11px] text-gray-400 mt-1.5 px-1">当对话中出现这些词时，此设定的内容会被注入到 AI 的记忆中。若留空，则始终生效。</p>
                    </div>

                    {/* Injection Position */}
                    <div>
                        <label className="text-[12px] font-medium text-gray-500 mb-2 block uppercase tracking-wide">插入位置</label>
                        <div className="relative">
                            <select
                                value={localEntry.injectionPosition || 'before_char'}
                                onChange={e => setLocalEntry({ ...localEntry, injectionPosition: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#5B7FFF]/50 appearance-none"
                            >
                                <option value="before_char">人设上方 (最高优先级)</option>
                                <option value="after_char">人设下方 (补充设定)</option>
                                <option value="after_scenario">历史记录后 (即时状态)</option>
                            </select>
                            <ArrowDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">内容设定</label>
                            <span className="text-[10px] text-[#5B7FFF] font-mono bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                {localEntry.content?.length || 0} 字
                            </span>
                        </div>
                        <textarea
                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#5B7FFF]/50 h-48 resize-none leading-relaxed font-mono text-[14px]"
                            placeholder="在这里输入具体的设定内容..."
                            value={localEntry.content}
                            onChange={e => setLocalEntry({ ...localEntry, content: e.target.value })}
                        />
                    </div>

                    {/* Enable Switch */}
                    <div className="flex items-center justify-between pt-2">
                        <div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white block">启用此词条</span>
                            <span className="text-[11px] text-gray-400 block mt-0.5">关闭后，此设定将完全失效，不会消耗 Token。</span>
                        </div>
                        <button
                            onClick={() => setLocalEntry({ ...localEntry, enabled: !localEntry.enabled })}
                            className={`w-12 h-7 rounded-full p-1 transition-colors ${localEntry.enabled ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${localEntry.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {localEntry.id && (
                        <div className="pt-6 mt-6 border-t border-gray-100 dark:border-white/5">
                            <button
                                onClick={() => onDelete(localEntry.id)}
                                className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} />
                                删除词条
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </IOSPage>
    );
};

const WorldBookManager = ({ onBack }) => {
    const entries = useLiveQuery(() => db.worldBookEntries.toArray());
    const characters = useLiveQuery(() => db.characters.toArray());

    const [editing, setEditing] = useState(null); // If not null, shows Editor Page

    // Initial state factory
    const createNewEntry = () => ({
        title: '',
        keys: '',
        content: '',
        isGlobal: true,
        characterId: null,
        injectionPosition: 'before_char',
        enabled: true
    });

    const handleSave = async (entry) => {
        if (entry.id) {
            await db.worldBookEntries.update(entry.id, entry);
        } else {
            await db.worldBookEntries.add({ ...entry, enabled: true });
        }
        setEditing(null);
    };

    const handleDelete = async (id) => {
        if (confirm('删除此词条?')) {
            await db.worldBookEntries.delete(id);
            setEditing(null);
        }
    };

    const rightButton = (
        <button onClick={() => setEditing(createNewEntry())} className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-md active:scale-95 transition-transform">
            <Plus size={20} />
        </button>
    );

    return (
        <div className="w-full h-full relative">
            {/* List View - Always Mounted at Bottom */}
            <IOSPage title="世界书" onBack={onBack} rightButton={rightButton}>
                <div className="p-4 space-y-3 pb-24 bg-[#F2F2F7] dark:bg-black min-h-full">
                    {entries?.map(entry => {
                        const charName = entry.characterId ? characters?.find(c => c.id === entry.characterId)?.name : null;

                        return (
                            <div key={entry.id} onClick={() => setEditing(entry)} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 cursor-pointer shadow-sm border border-gray-200/50 dark:border-white/5 active:scale-[0.98] transition-transform">
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

            {/* Editor View - Overlaid with Animation */}
            <AnimatePresence>
                {editing && (
                    <div className="absolute inset-0 z-20">
                        <WorldBookEditor
                            entry={editing}
                            onBack={() => setEditing(null)}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            characters={characters}
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WorldBookManager;
