import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Book } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { triggerHaptic } from '../../../utils/haptics';

const WorldBookManager = ({ onBack }) => {
    const entries = useLiveQuery(() => db.worldBookEntries.toArray());
    const [editing, setEditing] = useState(null);

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
        <button onClick={() => setEditing({ keys: '', content: '' })} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#5B7FFF] text-white shadow-md active:scale-95 transition-transform">
            <Plus size={20} />
        </button>
    );

    return (
        <IOSPage title="世界书" onBack={onBack} rightButton={rightButton}>
            <div className="p-4 space-y-3 pb-24 bg-[#F2F2F7] dark:bg-black min-h-full">
                {entries?.map(entry => (
                    <div key={entry.id} onClick={() => setEditing(entry)} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 cursor-pointer shadow-sm border border-gray-200/50 dark:border-white/5 active:scale-[0.98] transition-transform">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-wrap gap-1.5">
                                {entry.keys.split(',').map(k => (
                                    <span key={k} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-[#5B7FFF] text-[12px] rounded-md font-medium">
                                        {k.trim()}
                                    </span>
                                ))}
                            </div>
                            <div className={`w-2 h-2 rounded-full ${entry.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                        </div>
                        <p className="text-[14px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                            {entry.content}
                        </p>
                    </div>
                ))}

                {(!entries || entries.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Book size={48} className="text-gray-200 mb-4" />
                        <p>添加关键词和设定，让 AI 更懂世界观</p>
                    </div>
                )}

                {/* Editor Modal */}
                {editing && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
                        <div className="absolute inset-0 bg-black/40 pointer-events-auto backdrop-blur-sm" onClick={() => setEditing(null)} />
                        <div className="bg-white dark:bg-[#1C1C1E] w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl p-6 relative pointer-events-auto animate-in slide-in-from-bottom duration-200">
                            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{editing.id ? '编辑词条' : '新建词条'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">关键词 (逗号分隔)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#5B7FFF]/50"
                                        placeholder="例如: 魔法, 学院"
                                        value={editing.keys}
                                        onChange={e => setEditing({ ...editing, keys: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">内容设定</label>
                                    <textarea
                                        className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#5B7FFF]/50 h-32 resize-none leading-relaxed"
                                        placeholder="当对话中出现关键词时，AI 将知道这些信息..."
                                        value={editing.content}
                                        onChange={e => setEditing({ ...editing, content: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    {editing.id && (
                                        <button
                                            onClick={() => handleDelete(editing.id)}
                                            className="p-3 bg-red-50 text-red-500 rounded-xl"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleSave(editing)}
                                        className="flex-1 py-3 bg-[#5B7FFF] text-white rounded-xl font-bold shadow-lg shadow-[#5B7FFF]/20"
                                    >
                                        保存
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </IOSPage>
    );
};

export default WorldBookManager;
