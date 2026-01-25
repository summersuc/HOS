import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, ListMusic, X, Disc } from 'lucide-react';
import { useAudio } from '../../../hooks/useAudio';
import { useListenTogether } from '../../../hooks/useListenTogether';
import { MusicService } from '../../../services/MusicService';

const ListenTogetherPlayer = ({ visible, onClose }) => {
    const { currentTrack, isPlaying, togglePlay, playNextTrack, queue, playTrack } = useAudio();
    const { isEnabled, set: setListenTogether } = useListenTogether();
    const [showQueue, setShowQueue] = useState(false);

    // If generic 'Listen Together' logic is disabled, don't show anything ever.
    if (!isEnabled) return null;

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Backdrop for explicit close */}
                    <div className="absolute inset-0 z-20" onClick={onClose} />

                    {/* Positioned Popover (Top Right) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute top-16 right-4 z-30 flex flex-col items-center origin-top-right"
                    >
                        {/* Main Capsule */}
                        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-2 flex flex-col gap-2 shadow-2xl min-w-[200px]">

                            {/* Current Track Info */}
                            {currentTrack ? (
                                <div className="flex items-center gap-3 pr-2">
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0">
                                        <motion.img
                                            src={currentTrack.al?.picUrl}
                                            className="w-full h-full object-cover"
                                            animate={{ rotate: isPlaying ? 360 : 0 }}
                                            transition={{ duration: 8, ease: "linear", repeat: Infinity, repeatType: "loop" }}
                                            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                                        />
                                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-full" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-black rounded-full" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <span className="text-white text-xs font-bold truncate">{currentTrack.name}</span>
                                        <span className="text-white/60 text-[10px] truncate">{currentTrack.ar?.map(a => a.name).join('/')}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex p-2 text-white/50 text-xs justify-center">未播放</div>
                            )}

                            {/* Controls Row */}
                            {currentTrack && (
                                <div className="flex items-center justify-between px-2 pb-1">
                                    <button
                                        onClick={() => setShowQueue(!showQueue)}
                                        className={`p-1.5 rounded-full transition-colors ${showQueue ? 'text-green-400 bg-white/10' : 'text-white/50 hover:bg-white/10'}`}
                                    >
                                        <ListMusic size={16} />
                                    </button>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("Toggle Play Clicked");
                                                togglePlay();
                                            }}
                                            className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-95"
                                        >
                                            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("Next Track Clicked");
                                                playNextTrack();
                                            }}
                                            className="p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors active:scale-95"
                                        >
                                            <SkipForward size={16} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Queue List (Expandable) */}
                            <AnimatePresence>
                                {showQueue && currentTrack && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-white/10 overflow-hidden"
                                    >
                                        <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar mt-1">
                                            {queue.map((track, i) => {
                                                const isCurr = track.id === currentTrack.id;
                                                return (
                                                    <div
                                                        key={track.id + i}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            // Fetch URL and Play
                                                            try {
                                                                const res = await MusicService.getSongUrl(track.id);
                                                                if (res?.data?.[0]?.url) {
                                                                    playTrack(track, res.data[0].url, queue);
                                                                }
                                                            } catch (err) {
                                                                console.error("Failed to play track from list", err);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer ${isCurr ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                                    >
                                                        {isCurr ? (
                                                            <div className="w-3 h-3 flex items-end justify-center gap-[1px] shrink-0">
                                                                <div className="w-[2px] bg-green-400 animate-music-bar-1 h-3" />
                                                                <div className="w-[2px] bg-green-400 animate-music-bar-2 h-2" />
                                                                <div className="w-[2px] bg-green-400 animate-music-bar-3 h-3" />
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-white/40 w-3 text-center shrink-0">{i + 1}</span>
                                                        )}
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className={`text-[11px] truncate ${isCurr ? 'text-green-400 font-bold' : 'text-white/90'}`}>{track.name}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Quit Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setListenTogether(false);
                                    onClose();
                                }}
                                className="w-full mt-1 py-1.5 text-[10px] text-red-400 hover:bg-white/5 rounded-xl transition-colors border-t border-white/5"
                            >
                                退出一起听
                            </button>
                        </div>

                        <style>{`
                            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
                            @keyframes music-bar { 0%, 100% { height: 40%; } 50% { height: 100%; } }
                            .animate-music-bar-1 { animation: music-bar 0.6s ease-in-out infinite; }
                            .animate-music-bar-2 { animation: music-bar 0.6s ease-in-out infinite 0.1s; }
                            .animate-music-bar-3 { animation: music-bar 0.6s ease-in-out infinite 0.2s; }
                        `}</style>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ListenTogetherPlayer;
