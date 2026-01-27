import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, ListMusic, Repeat, Repeat1, Shuffle, X, Disc, History, Library } from 'lucide-react';
import { useAudio } from '../../../hooks/useAudio';
import { useListenTogether } from '../../../hooks/useListenTogether';
import { MusicService } from '../../../services/MusicService';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';

const ListenTogetherPlayer = ({ visible, onClose, conversationId, onSwitchPlaylist, onQuit }) => {
    const { currentTrack, isPlaying, togglePlay, playNextTrack, playPrevTrack, queue, playTrack, toggleMode, mode } = useAudio();
    const { isEnabled, set: setListenTogether } = useListenTogether();
    const [showQueue, setShowQueue] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Fetch History from DB (Same as before)
    const historyMsgs = useLiveQuery(async () => {
        if (!conversationId && conversationId !== 0) return [];
        try {
            const msgs = await db.messengerMessages
                .where('[conversationType+conversationId]')
                .equals(['single', conversationId])
                .filter(m => m.msgType === 'event_music_history')
                .toArray();
            return msgs.sort((a, b) => b.timestamp - a.timestamp);
        } catch (e) { return []; }
    }, [conversationId]);

    const parsedHistory = React.useMemo(() => {
        const songs = [];
        historyMsgs?.forEach(msg => {
            const match = msg.content.match(/\[History Summary: User listened to (.*?)\]/);
            if (match && match[1]) {
                const list = match[1].split(' -> ');
                list.reverse().forEach(s => songs.push({ name: s, timestamp: msg.timestamp }));
            }
        });
        return songs;
    }, [historyMsgs]);

    if (!isEnabled) return null;

    const getModeIcon = () => {
        switch (mode) {
            case 'loop': return <Repeat1 size={14} className="text-green-500 dark:text-green-400" />;
            case 'shuffle': return <Shuffle size={14} className="text-purple-500 dark:text-purple-400" />;
            default: return <Repeat size={14} className="text-gray-400 dark:text-white/60" />;
        }
    };

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Backdrop for explicit close */}
                    <div className="absolute inset-0 z-20" onClick={onClose} />

                    {/* Positioned Popover (Top Right) */}
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-16 right-4 z-50 flex flex-col items-center origin-top-right"
                    >
                        {/* Main Capsule - Frosted Glass Upgrade */}
                        <div className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[28px] p-3 flex flex-col gap-3 shadow-2xl min-w-[220px] max-w-[260px] ring-1 ring-black/5 overflow-hidden">

                            {/* Current Track Info */}
                            {currentTrack ? (
                                <div className="flex items-center gap-3 pr-1 w-full overflow-hidden">
                                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 shrink-0 shadow-lg border border-white/20 dark:border-white/10">
                                        <motion.img
                                            src={currentTrack.al?.picUrl}
                                            className="w-full h-full object-cover"
                                            animate={{ rotate: isPlaying ? 360 : 0 }}
                                            transition={{ duration: 8, ease: "linear", repeat: Infinity, repeatType: "loop" }}
                                            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                                        />
                                        <div className="absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-full" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 bg-gray-900/80 dark:bg-black/80 rounded-full border border-white/30" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 overflow-hidden">
                                        {/* Marquee Container */}
                                        <div className="relative w-full overflow-hidden h-[18px]">
                                            <div className={`whitespace-nowrap absolute top-0 left-0 ${currentTrack.name.length > 12 ? 'animate-marquee' : ''}`}>
                                                <span className="text-gray-900 dark:text-white text-[13px] font-bold tracking-tight mr-4">{currentTrack.name}</span>
                                                {currentTrack.name.length > 12 && <span className="text-gray-900 dark:text-white text-[13px] font-bold tracking-tight">{currentTrack.name}</span>}
                                            </div>
                                        </div>
                                        <span className="text-gray-500 dark:text-white/70 text-[11px] truncate leading-tight font-medium block">
                                            {currentTrack.ar?.map(a => a.name).join('/')}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex p-2 text-gray-400 dark:text-white/50 text-xs justify-center font-medium">未播放</div>
                            )}

                            {/* Controls Row */}
                            {currentTrack && (
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-1">
                                        {/* Switch Playlist - NEW */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSwitchPlaylist && onSwitchPlaylist(); }}
                                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all text-pink-500 dark:text-pink-400"
                                            title="切换歌单"
                                        >
                                            <Library size={14} />
                                        </button>

                                        {/* Mode Toggle */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleMode(); }}
                                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all text-gray-500 dark:text-white/80"
                                            title="播放模式"
                                        >
                                            {getModeIcon()}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Prev */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); playPrevTrack(); }}
                                            className="p-1.5 text-gray-700 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors active:scale-90"
                                        >
                                            <SkipBack size={18} fill="currentColor" />
                                        </button>

                                        {/* Play/Pause */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                            className="w-10 h-10 flex items-center justify-center text-white dark:text-black bg-gray-900 dark:bg-white hover:scale-105 rounded-full transition-all active:scale-95 shadow-lg shadow-black/10 dark:shadow-white/10"
                                        >
                                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                                        </button>

                                        {/* Next */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); playNextTrack(); }}
                                            className="p-1.5 text-gray-700 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors active:scale-90"
                                        >
                                            <SkipForward size={18} fill="currentColor" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Queue Toggle - RESTORED */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowQueue(!showQueue); setShowHistory(false); }}
                                            className={`p-1.5 rounded-full transition-all active:scale-95 ${showQueue ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-500 dark:text-pink-400' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/80'}`}
                                            title="歌曲清单"
                                        >
                                            <ListMusic size={16} />
                                        </button>

                                        {/* History Toggle */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); setShowQueue(false); }}
                                            className={`p-1.5 rounded-full transition-all active:scale-95 ${showHistory ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/80'}`}
                                            title="听歌历史"
                                        >
                                            <History size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Queue List (Expandable) ... (Could add queue button back if space permits, removing for space or keeping?) 
                                * User didn't ask to remove Queue. I replaced ListMusic with SwitchPlaylist. 
                                * I should probably keep Queue toggle or merge them?
                                * Let's put Queue toggle back if possible, or assume Switch Playlist is more important?
                                * "Feat: Add Switch Playlist Entrance".
                                * I used ListMusic icon for Switch Playlist.
                                * Let's restore Queue toggle but maybe move it?
                                * I'll put Queue toggle on the far right maybe? 
                                * Or just add it back.
                            */}

                            {/* Restoring Queue Toggle but maybe smaller or clustered */}

                            {/* Queue List (Expandable) */}
                            <AnimatePresence>
                                {showQueue && currentTrack && (
                                    <motion.div
                                        key="queue-panel"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-200 dark:border-white/10 overflow-hidden -mx-1 px-1"
                                    >
                                        <div className="max-h-56 overflow-y-auto p-1 custom-scrollbar mt-2 space-y-0.5">
                                            {queue.map((track, i) => {
                                                const isCurr = track.id === currentTrack.id;
                                                return (
                                                    <div
                                                        key={track.id + i}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                const res = await MusicService.getSongUrl(track.id);
                                                                if (res?.data?.[0]?.url) {
                                                                    playTrack(track, res.data[0].url, queue);
                                                                }
                                                            } catch (err) { }
                                                        }}
                                                        className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors ${isCurr ? 'bg-gray-100 dark:bg-white/20 shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-white/5 active:bg-gray-200 dark:active:bg-white/10'}`}
                                                    >
                                                        {isCurr ? (
                                                            <div className="w-3 h-3 flex items-end justify-center gap-[1px] shrink-0">
                                                                <div className="w-[2px] bg-green-500 dark:bg-green-400 animate-music-bar-1 h-3 rounded-full" />
                                                                <div className="w-[2px] bg-green-500 dark:bg-green-400 animate-music-bar-2 h-2 rounded-full" />
                                                                <div className="w-[2px] bg-green-500 dark:bg-green-400 animate-music-bar-3 h-3 rounded-full" />
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 dark:text-white/40 w-3 text-center shrink-0 font-medium">{i + 1}</span>
                                                        )}
                                                        <div className="flex-1 min-w-0 pr-1">
                                                            <div className={`text-[12px] truncate leading-tight ${isCurr ? 'text-green-600 dark:text-green-300 font-bold' : 'text-gray-900 dark:text-white/90'}`}>{track.name}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* History List (Expandable) */}
                            <AnimatePresence>
                                {showHistory && (
                                    <motion.div
                                        key="history-panel"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-200 dark:border-white/10 overflow-hidden -mx-1 px-1"
                                    >
                                        <div className="max-h-56 overflow-y-auto p-1 custom-scrollbar mt-2 space-y-1">
                                            <div className="px-2 py-1 flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">听歌历史</span>
                                                <span className="text-[10px] text-gray-400/60 font-medium">{parsedHistory.length} 首</span>
                                            </div>
                                            {parsedHistory.length > 0 ? (
                                                parsedHistory.map((song, i) => (
                                                    <div key={i} className="flex flex-col px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group" onClick={(e) => e.stopPropagation()}>
                                                        <div className="text-[12px] text-gray-800 dark:text-white/90 truncate font-medium">{song.name}</div>
                                                        <div className="text-[9px] text-gray-400/80 group-hover:text-gray-500 transition-colors">
                                                            {new Date(song.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-8 flex flex-col items-center justify-center opacity-30 gap-2">
                                                    <History size={24} />
                                                    <span className="text-[11px]">暂无历史记录</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Quit Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setListenTogether(false);
                                    if (onQuit) onQuit();
                                    onClose();
                                }}
                                className="w-full mt-1 py-2 text-[11px] font-medium text-red-500/80 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-white/10 rounded-xl transition-all border-t border-gray-200 dark:border-white/5 active:scale-98"
                            >
                                退出一起听
                            </button>
                        </div>

                        <style>{`
                            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
                            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
                            @keyframes music-bar { 0%, 100% { height: 40%; } 50% { height: 100%; } }
                            .animate-music-bar-1 { animation: music-bar 0.6s ease-in-out infinite; }
                            .animate-music-bar-2 { animation: music-bar 0.6s ease-in-out infinite 0.1s; }
                            .animate-music-bar-3 { animation: music-bar 0.6s ease-in-out infinite 0.2s; }
                            @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                            .animate-marquee { display: flex; animation: marquee 10s linear infinite; }
                        `}</style>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ListenTogetherPlayer;
