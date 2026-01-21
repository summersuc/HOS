import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';

const ContactPicker = ({ mode = 'single', title = '选择联系人', onSelect, onCancel }) => {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const characters = useLiveQuery(() => db.characters.orderBy('name').toArray());

    const handleToggle = (id) => {
        if (mode === 'single') {
            onSelect(id);
        } else {
            const newSet = new Set(selectedIds);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setSelectedIds(newSet);
        }
    };

    const handleMultiConfirm = () => {
        onSelect(Array.from(selectedIds));
    };

    return (
        <IOSPage title={title} onBack={onCancel} rightButton={
            mode === 'multi' && (
                <button
                    onClick={handleMultiConfirm}
                    disabled={selectedIds.size === 0}
                    className={`font-semibold text-[16px] ${selectedIds.size > 0 ? 'text-[#5B7FFF]' : 'text-gray-300'}`}
                >
                    完成({selectedIds.size})
                </button>
            )
        }>
            <div className="bg-[#F2F2F7] dark:bg-black min-h-full pb-20">
                <div className="px-4 py-2 text-[13px] text-gray-400">联系人</div>
                <div className="bg-white dark:bg-[#1C1C1E] border-y border-gray-200 dark:border-white/5">
                    {characters?.map((char, index) => (
                        <div
                            key={char.id}
                            onClick={() => handleToggle(char.id)}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-gray-100 dark:active:bg-[#2C2C2E]"
                        >
                            {/* Checkbox for multi mode */}
                            {mode === 'multi' && (
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedIds.has(char.id)
                                        ? 'bg-[#5B7FFF] border-[#5B7FFF]'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                    {selectedIds.has(char.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                            )}

                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#2C2C2E] overflow-hidden shrink-0">
                                {char.avatar ? (
                                    <img src={char.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{char.name?.[0]}</div>
                                )}
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0 border-b border-gray-100 dark:border-white/5 py-1">
                                <div className="font-medium text-[16px] text-gray-900 dark:text-white">{char.nickname || char.name}</div>
                            </div>
                        </div>
                    ))}
                    {(!characters || characters.length === 0) && (
                        <div className="py-8 text-center text-gray-400 text-sm">暂无联系人</div>
                    )}
                </div>
            </div>
        </IOSPage>
    );
};

export default ContactPicker;
