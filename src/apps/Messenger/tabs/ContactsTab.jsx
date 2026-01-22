import React from 'react';
import Avatar from '../components/Avatar';
import { Search, Plus, Star, ChevronRight, Users } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';

const ContactsTab = ({ onSelectCharacter, onNewCharacter }) => {
    const characters = useLiveQuery(() => db.characters.orderBy('name').toArray());

    const grouped = React.useMemo(() => {
        if (!characters) return { favorites: [], letters: {} };
        const favorites = characters.filter(c => c.isFavorite);
        const letters = {};
        characters.forEach(char => {
            const firstLetter = (char.name?.[0] || '?').toUpperCase();
            if (!letters[firstLetter]) letters[firstLetter] = [];
            letters[firstLetter].push(char);
        });
        return { favorites, letters };
    }, [characters]);

    return (
        <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-black">
            {/* Header */}
            <div className="shrink-0 pt-[var(--sat)] bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/5">
                <div className="h-[56px] flex items-center justify-between px-4">
                    <h1 className="text-[28px] font-bold text-gray-900 dark:text-white tracking-tight">通讯录</h1>
                    <button
                        onClick={() => { triggerHaptic(); onNewCharacter(); }}
                        className="w-9 h-9 rounded-full bg-[#5B7FFF] flex items-center justify-center shadow-lg shadow-[#5B7FFF]/25 active:scale-95 transition-transform"
                    >
                        <Plus size={20} className="text-white" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="shrink-0 px-4 py-3 bg-[#F2F2F7] dark:bg-black">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="搜索" className="w-full bg-white dark:bg-[#1C1C1E] rounded-xl py-2.5 pl-10 pr-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#5B7FFF]/30 text-gray-800 dark:text-white placeholder-gray-400 border border-gray-200/50 dark:border-white/5" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {/* Group Chats Section */}
                <div className="mb-3">
                    <div className="py-2 flex items-center gap-1.5">
                        <Users size={13} className="text-[#5B7FFF]" />
                        <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">群聊</span>
                    </div>
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 text-[14px] text-gray-400 text-center">暂无群聊</div>
                    </div>
                </div>

                {/* Favorites */}
                {grouped.favorites.length > 0 && (
                    <div className="mb-3">
                        <div className="py-2 flex items-center gap-1.5">
                            <Star size={13} className="text-amber-500" fill="#F59E0B" />
                            <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">收藏</span>
                        </div>
                        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
                            {grouped.favorites.map((char, i) => (
                                <ContactItem key={`fav-${char.id}`} char={char} onSelect={onSelectCharacter} isLast={i === grouped.favorites.length - 1} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Alphabetical Groups */}
                {Object.keys(grouped.letters).sort().map(letter => (
                    <div key={letter} className="mb-3">
                        <div className="py-2">
                            <span className="text-[12px] font-bold text-gray-400">{letter}</span>
                        </div>
                        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
                            {grouped.letters[letter].map((char, i) => (
                                <ContactItem key={char.id} char={char} onSelect={onSelectCharacter} isLast={i === grouped.letters[letter].length - 1} />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {(!characters || characters.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-[60%] text-gray-400 p-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-5 shadow-lg">
                            <Plus size={36} className="text-gray-300" />
                        </div>
                        <p className="text-[16px] font-medium text-gray-500">还没有联系人</p>
                        <button onClick={onNewCharacter} className="mt-5 px-6 py-2.5 bg-[#5B7FFF] text-white rounded-full text-[15px] font-semibold shadow-lg shadow-[#5B7FFF]/25 active:scale-95 transition-transform">
                            添加联系人
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ContactItem = ({ char, onSelect, isLast }) => (
    <div
        onClick={() => { triggerHaptic(); onSelect(char.id); }}
        className="flex items-center gap-3.5 px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors"
        style={{ borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.06)' }}
    >
        <Avatar src={char.avatar} name={char.name} size={44} className="rounded-full shadow" />
        <span className="flex-1 font-medium text-[16px] text-gray-900 dark:text-white">{char.nickname || char.name}</span>
        <ChevronRight size={18} className="text-gray-300" />
    </div>
);

export default ContactsTab;
