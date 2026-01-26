
import React, { useRef, useEffect, useState } from 'react';
import { useAudio } from '../../../hooks/useAudio';
import { Play, Pause, SkipForward, SkipBack, Disc, Music } from 'lucide-react';
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
        playPrevTrack
    } = useAudio();

    // Determine layout based on size
    const isMedium = size === '4x2';
    const isSmall = size === '2x2';
    const isWideSmall = size === '2x1';

    // Format time
    const formatTime = (time) => {
        if (!time && time !== 0) return '0:00';
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const percent = duration > 0 ? (progress / duration) * 100 : 0;

    // Helper to open Music App (simulate via window event or just visual)
    const openMusicApp = () => {
        window.dispatchEvent(new CustomEvent('open-app', { detail: { appId: 'music' } }));
    };

    if (!currentTrack) {
        // Empty State - also scaled
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div
                    className={`bg-white/20 dark:bg-[#1C1C1E]/40 backdrop-blur-xl flex flex-col items-center justify-center p-3 rounded-[2rem] ${isSmall ? 'w-[160px] h-[160px]' : 'w-full h-full'}`}
                    onClick={openMusicApp}
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
        <div className="w-full h-full flex items-center justify-center">
            <div className={`relative overflow-hidden group rounded-[2rem] shadow-sm ${isSmall ? 'w-[160px] h-[160px]' : ''} ${isMedium ? 'w-[98%] h-[85%]' : ''}`}>
                {/* Blurred Background Art */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700 blur-xl scale-125 opacity-60 dark:opacity-40"
                    style={{ backgroundImage: `url(${currentTrack.al?.picUrl})` }}
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/40 to-white/10 dark:from-black/80 dark:via-black/40 dark:to-black/10" />

                {/* Content Container - Reduced Padding */}
                <div className="relative z-10 w-full h-full flex flex-col justify-between p-3.5">

                    {/* Top: Art & Info - Horizontal Layout for BOTH Sizes 
                        ADDED: mt-1.5 for 2x2 specific vertical centering fix
                        ADDED: mt-1 for 4x2 vertical centering/shift request
                    */}
                    <div className={`flex flex-row items-center gap-3 w-full min-h-0 min-w-0 ${isSmall ? 'mt-1.5' : ''} ${isMedium ? 'mt-1' : ''}`}>
                        {/* Album Art */}
                        <motion.div
                            className={`relative rounded-full overflow-hidden shadow-md ${isMedium ? 'w-20 h-20' : 'w-16 h-16'} shrink-0 bg-gray-200 dark:bg-gray-800 ring-2 ring-white/20`}
                            // Spinning effect
                            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                        >
                            <img src={currentTrack.al?.picUrl} alt="" className="w-full h-full object-cover" />
                            {/* Center Disc Hole */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-white/20 backdrop-blur-md ring-1 ring-black/10" />
                            </div>
                        </motion.div>

                        {/* Text Info - Sliding Text */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden h-full py-1">
                            <ScrollingText className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                                {currentTrack.name}
                            </ScrollingText>
                            <ScrollingText className="text-[12px] text-gray-600 dark:text-gray-300/80 font-medium mt-1">
                                {currentTrack.ar?.[0]?.name}
                            </ScrollingText>
                        </div>

                        {/* Medium Only: Extra Waveform Viz - Shifted slightly */}
                        {isMedium && (
                            <div className="hidden sm:flex items-end gap-0.5 h-6 opacity-60 shrink-0 ml-1">
                                {[...Array(6)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1 bg-gray-900 dark:bg-white rounded-full"
                                        animate={{ height: isPlaying ? [6, 12, 4, 16, 8][i % 5] + Math.random() * 6 : 3 }}
                                        transition={{ duration: 0.4, repeat: Infinity, repeatType: "mirror" }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Progress Bar & Controls */}
                    <div className="w-full mt-auto flex flex-col gap-2">

                        {/* Progress Group */}
                        <div className="w-full flex flex-col gap-1">
                            {/* Duration Label */}
                            <div className="flex justify-end">
                                <span className="text-[10px] text-gray-700 dark:text-white/60 font-medium font-mono tabular-nums leading-none">
                                    {formatTime(duration)}
                                </span>
                            </div>
                            {/* Horizontal Progress */}
                            <div className="w-full h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gray-900/80 dark:bg-white rounded-full"
                                    animate={{ width: `${percent}%` }}
                                    transition={{ type: "tween", ease: "linear", duration: 0.5 }}
                                />
                            </div>
                        </div>

                        {/* Controls - Compact Layout */}
                        <div className={`flex items-center justify-center gap-5 w-full ${isMedium ? 'pb-1' : ''}`}>
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MusicWidget;
