import React from 'react';
import Avatar from '../components/Avatar';
import { Search, Star, Users } from 'lucide-react';
import { Plus, ChevronRight } from '../icons';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import { motion } from 'framer-motion';
import { pinyin } from 'pinyin-pro';

const ContactsTab = ({ onSelectCharacter, onNewCharacter }) => {
    const characters = useLiveQuery(() => db.characters.orderBy('name').toArray());

    const grouped = React.useMemo(() => {
        if (!characters) return { favorites: [], letters: {} };
        const favorites = characters.filter(c => c.isFavorite);
        const letters = {};
        characters.forEach(char => {
            const name = char.nickname || char.name || '?';
            const py = pinyin(name, { pattern: 'first', toneType: 'none', type: 'array' });
            let firstLetter = (py[0] || '?')[0].toUpperCase();
            if (!/[A-Z]/.test(firstLetter)) firstLetter = '#';

            if (!letters[firstLetter]) letters[firstLetter] = [];
            letters[firstLetter].push(char);
        });
        return { favorites, letters };
    }, [characters]);

    return (
        <div className="h-full flex flex-col bg-[var(--bg-primary-light)] dark:bg-[var(--bg-primary-dark)] transition-colors duration-300">
            {/* Header - V3 Soft Gradient Blur */}
            <div className="shrink-0 relative z-30">
                <div
                    className="absolute top-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-b from-[#F2F2F7]/95 to-transparent dark:from-black/90 dark:to-transparent backdrop-blur-xl"
                    style={{
                        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                    }}
                />
                <div className="relative pt-[var(--sat)] h-[calc(56px+var(--sat))] flex items-center justify-between px-5">
                    <h1 className="text-[32px] font-bold text-gray-900 dark:text-gray-200 tracking-tight">通讯录</h1>
                    <motion.button
                        onClick={() => { triggerHaptic(); onNewCharacter(); }}
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
                    <input type="text" placeholder="搜索" className="w-full bg-white/50 dark:bg-[#1C1C1E]/50 backdrop-blur-xl rounded-xl py-2 pl-9 pr-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300/50 text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200/30 dark:border-white/8 transition-all duration-200" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
                {/* Group Chats Section Removed */}


                {/* Favorites */}
                {grouped.favorites.length > 0 && (
                    <div className="mb-3">
                        <div className="py-2 flex items-center gap-1.5">
                            <Star size={13} className="text-amber-500" fill="#F59E0B" />
                            <span className="text-[12px] font-semibold text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] uppercase tracking-wide">收藏</span>
                        </div>
                        <div className="bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl rounded-3xl overflow-hidden shadow-md border border-gray-200/50 dark:border-white/8">
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
                        <div className="bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl rounded-3xl overflow-hidden shadow-md border border-gray-200/50 dark:border-white/8">
                            {grouped.letters[letter].map((char, i) => (
                                <ContactItem key={char.id} char={char} onSelect={onSelectCharacter} isLast={i === grouped.letters[letter].length - 1} />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {(!characters || characters.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-[60%] text-gray-400 p-8">
                        <p className="text-[16px] font-medium text-gray-500">还没有联系人</p>
                        <button onClick={onNewCharacter} className="mt-5 px-6 py-2.5 bg-gray-500 text-white rounded-full text-[15px] font-semibold active:scale-95 transition-transform">
                            添加联系人
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ContactItem = ({ char, onSelect, isLast }) => (
    <motion.div
        onClick={() => { triggerHaptic(); onSelect(char.id); }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3.5 px-4 py-3 cursor-pointer active:bg-gray-100/50 dark:active:bg-white/5 transition-colors"
        style={{ borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.06)' }}
    >
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 p-0.5">
            <Avatar src={char.avatar} name={char.name} size={44} className="rounded-2xl" />
        </div>
        <span className="flex-1 font-medium text-[16px] text-[var(--text-primary-light)] dark:text-[var(--text-primary-dark)]">{char.nickname || char.name}</span>
        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
    </motion.div>
);

export default ContactsTab;
