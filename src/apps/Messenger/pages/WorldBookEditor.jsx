import React, { useState } from 'react';
import { User, Globe, ArrowDown } from 'lucide-react';
import IOSPage from '../../../components/AppWindow/IOSPage';

import { db } from '../../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';

const WorldBookEditor = ({ entry, onBack, onSave, onDelete }) => {
    const characters = useLiveQuery(() => db.characters.toArray());
    const [localEntry, setLocalEntry] = useState(entry || {
        title: '',
        keys: '',
        content: '',
        isGlobal: true,
        characterId: null,
        injectionPosition: 'before_char',
        enabled: true
    });

    const isNew = !entry?.id;

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
            title={isNew ? '新建词条' : '编辑词条'}
            onBack={onBack}
            rightButton={rightButton}
            enableEnterAnimation={true}
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

                    {!isNew && (
                        <div className="pt-6 mt-6 border-t border-gray-100 dark:border-white/5">
                            <button
                                onClick={() => onDelete(localEntry.id)}
                                className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                {/* <Trash2 size={18} /> */}
                                删除词条
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </IOSPage>
    );
};

export default WorldBookEditor;
