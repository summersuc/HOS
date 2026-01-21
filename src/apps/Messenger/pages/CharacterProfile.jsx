import React from 'react';
import { MessageCircle, Settings, MoreHorizontal, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';

const CharacterProfile = ({ characterId, onBack, onMessage, onEdit }) => {
    const character = useLiveQuery(() => db.characters.get(characterId), [characterId]);

    if (!character) return null;

    return (
        <IOSPage title="详细资料" onBack={onBack} rightButton={
            <button onClick={onEdit} className="text-gray-900 dark:text-white"><MoreHorizontal size={24} /></button>
        }>
            <div className="bg-[#F2F2F7] dark:bg-black min-h-full pb-10">
                {/* Header Info */}
                <div className="bg-white dark:bg-[#1C1C1E] pb-6 pt-4 px-4 flex flex-col items-center border-b border-gray-200 dark:border-white/5 mb-3">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#2C2C2E] mb-4 shadow-sm border border-gray-100 dark:border-white/5">
                        {character.avatar ? (
                            <img src={character.avatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">{character.name?.[0]}</div>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{character.nickname || character.name}</h2>
                    {character.nickname && <p className="text-gray-500 text-sm">姓名: {character.name}</p>}
                </div>

                {/* Info List */}
                <div className="bg-white dark:bg-[#1C1C1E] border-y border-gray-200 dark:border-white/5 mb-6">
                    <div className="px-4 py-4 flex gap-4">
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white shrink-0">人设</span>
                        <p className="text-[15px] text-gray-500 leading-relaxed">
                            {character.description || '暂无人设描述'}
                        </p>
                    </div>
                    {character.scenario && (
                        <>
                            <div className="h-px bg-gray-100 dark:bg-white/5 mx-4" />
                            <div className="px-4 py-4 flex gap-4">
                                <span className="text-[15px] font-medium text-gray-900 dark:text-white shrink-0">场景</span>
                                <p className="text-[15px] text-gray-500 leading-relaxed">
                                    {character.scenario}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="px-4">
                    <button
                        onClick={onMessage}
                        className="w-full py-3.5 bg-[#5B7FFF] active:bg-[#4A6EEE] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center gap-2 shadow-lg shadow-[#5B7FFF]/20 transition-all active:scale-[0.98]"
                    >
                        <MessageCircle size={20} />
                        发消息
                    </button>
                </div>
            </div>
        </IOSPage>
    );
};

export default CharacterProfile;
