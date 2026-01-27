import React from 'react';
import Avatar from '../components/Avatar';
import { MessageCircle, Settings, MoreHorizontal, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { motion } from 'framer-motion';

const CharacterProfile = ({ characterId, onBack, onMessage, onEdit }) => {
    const character = useLiveQuery(() => db.characters.get(characterId), [characterId]);

    if (!character) return null;

    return (
        <IOSPage title="详细资料" onBack={onBack} rightButton={
            <button onClick={onEdit} className="text-gray-900 dark:text-white"><MoreHorizontal size={24} /></button>
        }>
            <div className="bg-[#F2F2F7] dark:bg-black min-h-full pb-10">
                {/* Header Info */}
                <div className="bg-gradient-to-b from-white/95 to-white/70 dark:from-[#1C1C1E]/95 dark:to-[#1C1C1E]/75 backdrop-blur-2xl pb-8 pt-6 px-4 flex flex-col items-center border-b border-gray-200/30 dark:border-white/8">

                    {/* 头像外圈渐变 - 高级白灰色 */}
                    <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-gray-200 via-white to-gray-300 dark:from-gray-600 dark:via-gray-500 dark:to-gray-700 p-[3px] shadow-2xl mb-5">
                        <div className="w-full h-full rounded-3xl bg-white dark:bg-[#1C1C1E] overflow-hidden">
                            <Avatar src={character.avatar} name={character.name} size={112} />
                        </div>
                    </div>

                    <h2 className="text-[28px] font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">{character.nickname || character.name}</h2>
                    {character.nickname && <p className="text-gray-500 text-sm">姓名: {character.name}</p>}
                </div>

                {/* Info List */}
                <div className="bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-y border-gray-200/50 dark:border-white/8 mb-6">
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
                    <motion.button
                        onClick={onMessage}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 bg-gradient-to-r from-gray-400 to-gray-500 active:from-gray-500 active:to-gray-600 text-white rounded-2xl font-semibold text-[17px] flex items-center justify-center gap-2.5 shadow-xl shadow-gray-400/30 transition-all duration-200"
                    >
                        <MessageCircle size={22} />
                        发消息
                    </motion.button>
                </div>
            </div>
        </IOSPage>
    );
};

export default CharacterProfile;
