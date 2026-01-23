import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Music, Trash2 } from 'lucide-react';

const CurrentQueueSheet = ({ queue, currentIndex, onPlayIndex, onClose, onClear }) => {
    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[200000] bg-white dark:bg-[#1C1C1E] rounded-t-[20px] shadow-2xl flex flex-col max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold dark:text-white">当前播放</h3>
                    <span className="text-sm text-gray-400 font-normal">({queue.length})</span>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onClear}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="清空队列"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 no-scrollbar">
                {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                        <Music size={48} className="mb-4" />
                        <p className="text-sm">暂无播放歌曲</p>
                    </div>
                ) : (
                    queue.filter(Boolean).map((song, index) => (
                        <div
                            key={`queue-item-${song?.id || 'unknown'}-${index}`}
                            onClick={() => onPlayIndex(queue.indexOf(song))}
                            className={`flex items-center px-4 py-3 rounded-xl transition-colors cursor-pointer group ${index === currentIndex
                                ? 'bg-red-500/10'
                                : 'hover:bg-gray-50 dark:hover:bg-white/5 shadow-sm'
                                }`}
                        >
                            <div className="flex-1 min-w-0 flex items-center">
                                {index === currentIndex && (
                                    <div className="mr-3 text-red-500">
                                        <Play size={12} fill="currentColor" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm truncate ${index === currentIndex ? 'text-red-500 font-bold' : 'dark:text-white'}`}>
                                        {song.name || '未知歌曲'}
                                    </h4>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                        {song.ar?.[0]?.name || song.artists?.[0]?.name || '未知歌手'}
                                    </p>
                                </div>
                            </div>
                            {index === currentIndex && (
                                <div className="flex space-x-1 items-end h-3 mb-1">
                                    {[1, 2, 3].map(i => (
                                        <motion.div
                                            key={i}
                                            animate={{ height: [4, 12, 6, 12, 4] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                                            className="w-0.5 bg-red-500 rounded-full"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Safe Area Padding */}
            <div className="h-8 bg-transparent" />
        </motion.div>
    );
};

export default CurrentQueueSheet;
