import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAudio } from '../../../hooks/useAudio';
import { MusicService } from '../../../services/MusicService';
import { Play, Pause, SkipForward, SkipBack, Disc, Music, Repeat, Shuffle, ListMusic, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ScrollingText = ({ children, className }) => {
    const containerRef = useRef(null);
    const textRef = useRef(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    useEffect(() => {
        if (containerRef.current && textRef.current) {
            setShouldScroll(textRef.current.scrollWidth > containerRef.current.clientWidth);
        }
    }, [children]);

    return (
        <div ref={containerRef} className={`overflow-hidden relative ${className}`}>
            <motion.div
                ref={textRef}
                className="whitespace-nowrap"
                animate={shouldScroll ? { x: [0, -100] } : { x: 0 }}
                transition={shouldScroll ? {
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                    repeatType: "loop",
                    repeatDelay: 1
                } : {}}
            >
                {shouldScroll ? (
                    <span style={{ paddingRight: '20px' }}>{children} &nbsp;&nbsp;&nbsp; {children}</span>
                ) : children}
            </motion.div>
        </div>
    );
};

const MusicWidget = ({ size = '2x2', isActive = false }) => {
    const {
        currentTrack,
        isPlaying,
        progress,
        duration,
        togglePlay,
        playNextTrack,
        playPrevTrack,
        mode,
        toggleMode,
        queue,
        playTrack
    } = useAudio();

    // Lyrics State
    const [lyrics, setLyrics] = useState([]);
    const [currentLyric, setCurrentLyric] = useState('');

    // Playlist State
    const [showPlaylist, setShowPlaylist] = useState(false);

    // Determine layout based on size
    const isMedium = size === '4x2';
    const isSmall = size === '2x2';

    // Fetch Lyrics
    useEffect(() => {
        if (!currentTrack?.id) {
            setLyrics([]);
            setCurrentLyric('');
            return;
        }

        const fetchLyrics = async () => {
            try {
                // Use cached or new request
                const res = await MusicService.getLyric(currentTrack.id);
                const lrcText = res?.lrc?.lyric;
                if (!lrcText) {
                    setLyrics([]);
                    return;
                }

                // Parse LRC
                const lines = lrcText.split('\n');
                const parsed = [];
                const timeExp = /\[(\d{2}):(\d{2})(\.\d{2,3})?\]/;

                for (const line of lines) {
                    const match = timeExp.exec(line);
                    if (match && line.trim()) {
                        const min = parseInt(match[1]);
                        const sec = parseInt(match[2]);
                        const ms = match[3] ? parseFloat(match[3]) * 1000 : 0;
                        const time = min * 60 + sec + ms / 1000;
                        const text = line.replace(timeExp, '').trim();
                        if (text) parsed.push({ time, text });
                    }
                }
                setLyrics(parsed);
            } catch (e) {
                console.error("Widget lyrics failed", e);
            }
        };

        fetchLyrics();
    }, [currentTrack?.id]);

    // Update Lyric Line
    useEffect(() => {
        if (lyrics.length === 0) {
            setCurrentLyric('');
            return;
        }

        // Find last line that has passed
        let activeLine = '';
        for (let i = 0; i < lyrics.length; i++) {
            if (lyrics[i].time > progress) {
                break;
            }
            activeLine = lyrics[i].text;
        }
        // Only update if changed to avoid unnecessary re-renders
        setCurrentLyric(prev => prev !== activeLine ? activeLine : prev);
    }, [progress, lyrics]);

    // Format time
    const formatTime = (time) => {
        if (!time && time !== 0) return '0:00';
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const percent = duration > 0 ? (progress / duration) * 100 : 0;

    // Helper to open Music App
    const launchMusicApp = () => {
        window.dispatchEvent(new CustomEvent('launch-app', { detail: { appId: 'music' } }));
    };

    if (!currentTrack) {
        // Empty State
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div
                    className="bg-white/10 dark:bg-[#1C1C1E]/20 backdrop-blur-xl flex flex-col items-center justify-center p-3 rounded-[2rem] w-full h-full"
                    onClick={launchMusicApp}
                >
                    <div className="w-10 h-10 rounded-full bg-gray-200/50 dark:bg-white/10 flex items-center justify-center mb-2">
                        <Music size={20} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">暂无播放</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full flex items-center justify-center ${isMedium ? 'p-2.5' : 'p-0.5'}`}>
            <div className={`relative w-full h-full overflow-hidden group rounded-[2rem] shadow-sm`}>
                {/* Blurred Background Art */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700 blur-xl scale-125 opacity-30 dark:opacity-20"
                    style={{ backgroundImage: `url(${currentTrack.al?.picUrl})` }}
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-white/30 to-white/5 dark:from-black/50 dark:via-black/25 dark:to-black/5" />

                {/* Content Container */}
                <div className={`relative z-10 w-full h-full flex flex-col justify-between ${isMedium ? 'pt-5 pb-3 px-4' : 'p-3.5'}`}>

                    {/* Top Loop: Info Area */}
                    <div className={`flex flex-row items-center gap-3 w-full min-h-0 min-w-0 ${isMedium ? 'mt-0.5' : 'mt-1.5'}`}>
                        {/* Album Art - Restored Size for 4x2 */}
                        <motion.div
                            className={`relative rounded-full overflow-hidden shadow-md ${isMedium ? 'w-20 h-20' : 'w-16 h-16'} shrink-0 bg-gray-200 dark:bg-gray-800 ring-2 ring-white/20`}
                            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                        >
                            <img src={currentTrack.al?.picUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-white/20 backdrop-blur-md ring-1 ring-black/10" />
                            </div>
                        </motion.div>

                        {/* Text Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden h-full py-1">
                            {/* Title - Moved Up */}
                            <ScrollingText className={`font-bold text-gray-900 dark:text-white leading-normal pb-0.5 ${isMedium ? 'text-[15px]' : 'text-[15px]'}`}>
                                {currentTrack.name}
                            </ScrollingText>

                            {/* Artist Name - Always Visible */}
                            <div className="text-[12px] text-gray-900/80 dark:text-white/80 font-medium truncate">
                                {currentTrack.ar?.[0]?.name}
                            </div>

                            {/* Lyrics - Smooth Fade/Slide for Medium */}
                            {isMedium && (
                                <div className="h-5 mt-0.5 overflow-hidden relative w-full">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentLyric}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-[11px] text-gray-900/70 dark:text-white/70 font-medium truncate absolute w-full"
                                        >
                                            {currentLyric || "..."}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar & Controls */}
                    <div className="w-full mt-auto flex flex-col gap-2">

                        {/* Progress Group */}
                        <div className="w-full flex flex-col gap-1">
                            <div className="flex justify-end">
                                <span className="text-[10px] text-gray-700 dark:text-white/60 font-medium font-mono tabular-nums leading-none">
                                    {formatTime(duration)}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gray-900/80 dark:bg-white rounded-full"
                                    animate={{ width: `${percent}%` }}
                                    transition={{ type: "tween", ease: "linear", duration: 0.5 }}
                                />
                            </div>
                        </div>

                        {/* Controls - Enhanced for 4x2 */}
                        <div className={`flex items-center justify-center w-full ${isMedium ? 'gap-4 pb-0.5' : 'gap-5'}`}>

                            {/* Left: Mode Toggle (Only 4x2) */}
                            {isMedium && (
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); toggleMode(); }}
                                    className="text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
                                >
                                    {mode === 'loop' ? <Disc size={16} /> : mode === 'shuffle' ? <Shuffle size={16} /> : <Repeat size={16} />}
                                </motion.button>
                            )}

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); playPrevTrack(); }}
                                className="text-gray-600 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <SkipBack size={18} fill="currentColor" />
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-black shadow-md shadow-black/10"
                            >
                                {isPlaying ? (
                                    <Pause size={16} fill="currentColor" />
                                ) : (
                                    <Play size={16} fill="currentColor" className="ml-0.5" />
                                )
                                }
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); playNextTrack(); }}
                                className="text-gray-600 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <SkipForward size={18} fill="currentColor" />
                            </motion.button>

                            {/* Right: List Popup (Only 4x2) */}
                            {isMedium && (
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); setShowPlaylist(!showPlaylist); }}
                                    className={`text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors ${showPlaylist ? 'text-blue-500 dark:text-blue-400' : ''}`}
                                >
                                    <ListMusic size={16} />
                                </motion.button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Playlist Overlay (Floating Pop-up) */}
                {createPortal(
                    <AnimatePresence>
                        {showPlaylist && isMedium && (
                            <div
                                className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-black/20"
                                onClick={(e) => { e.stopPropagation(); setShowPlaylist(false); }}
                            >
                                {/* Floating Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="relative w-full max-w-[280px] bg-white/60 dark:bg-black/40 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[60vh] border border-white/30 dark:border-white/10"
                                    onClick={(e) => e.stopPropagation()}
                                    // Block all common pointer events to prevent DND kit on desktop from picking them up
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">播放列表</span>
                                            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-widest leading-none mt-1">Playlist</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowPlaylist(false); }}
                                            className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    {/* List Body */}
                                    <div className="flex-1 overflow-y-auto p-2 scrollbar-hide overscroll-contain" ref={(el) => {
                                        if (el && showPlaylist) {
                                            // Simple auto-scroll to active element after render
                                            const activeEl = el.querySelector('[data-active="true"]');
                                            if (activeEl) {
                                                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }
                                        }
                                    }}>
                                        <div className="space-y-1">
                                            {queue && queue.length > 0 ? (
                                                queue.map((track, i) => {
                                                    const isCurr = currentTrack?.id === track.id;
                                                    return (
                                                        <div
                                                            key={track.id + '-' + i}
                                                            data-active={isCurr}
                                                            className={`flex items-center gap-3 p-3 rounded-[1.2rem] cursor-pointer transition-all duration-300 active:scale-95 group relative overflow-hidden ${isCurr ? 'bg-pink-500/10 dark:bg-pink-400/10 ring-1 ring-pink-500/20 dark:ring-pink-400/20 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                MusicService.getSongUrl(track.id).then(res => {
                                                                    if (res?.data?.[0]?.url) playTrack(track, res.data[0].url);
                                                                });
                                                            }}
                                                        >
                                                            {/* Active Glow Background */}
                                                            {isCurr && <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-transparent pointer-events-none" />}

                                                            <div className="relative w-11 h-11 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                                <img src={track.al?.picUrl} alt="" className="w-full h-full rounded-xl object-cover shadow-sm bg-gray-100 dark:bg-white/10" />
                                                                {isCurr && isPlaying && (
                                                                    <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                                                                        <div className="flex items-center gap-[3px]">
                                                                            <div className="w-[3px] h-3 bg-white rounded-full animate-music-bar-1 shadow-sm" />
                                                                            <div className="w-[3px] h-2 bg-white rounded-full animate-music-bar-2 shadow-sm" />
                                                                            <div className="w-[3px] h-3 bg-white rounded-full animate-music-bar-3 shadow-sm" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0 z-10">
                                                                <div className={`text-[13px] font-bold truncate leading-tight mb-0.5 ${isCurr ? 'text-pink-600 dark:text-pink-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                                                    {track.name}
                                                                </div>
                                                                <div className={`text-[11px] truncate ${isCurr ? 'text-pink-500/70 dark:text-pink-300/70' : 'text-gray-400'}`}>
                                                                    {track.ar?.[0]?.name}
                                                                </div>
                                                            </div>
                                                            {isCurr && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)] animate-pulse" />
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="py-20 flex flex-col items-center justify-center opacity-30 gap-3">
                                                    <ListMusic size={32} />
                                                    <span className="text-xs font-medium">暂无播放记录</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom Spacer for reachability */}
                                    <div className="h-4 pointer-events-none shrink-0" />
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                <style>{`
                    @keyframes music-bar { 0%, 100% { height: 40%; } 50% { height: 100%; } }
                    .animate-music-bar-1 { animation: music-bar 0.6s ease-in-out infinite; }
                    .animate-music-bar-2 { animation: music-bar 0.6s ease-in-out infinite 0.1s; }
                    .animate-music-bar-3 { animation: music-bar 0.6s ease-in-out infinite 0.2s; }
                `}</style>
            </div>
        </div>
    );
};

export default MusicWidget;
