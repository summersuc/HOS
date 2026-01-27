import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useDragControls, useAnimation } from 'framer-motion';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, ListMusic, Heart, MessageSquare, Mic2, Sparkles, Headphones } from 'lucide-react';
import { MusicService } from '../../../services/MusicService';
import { useAudio } from '../../../hooks/useAudio';
import { useListenTogether } from '../../../hooks/useListenTogether';
import LyricsView from './LyricsView';
import CommentSheet from './CommentSheet';
import AuroraBackground from './AuroraBackground';

import ContactSelectorSheet from './ContactSelectorSheet';

const Player = ({ track, isPlaying, progress, duration, onTogglePlay, onClose, onNext, onPrev, mode, onToggleMode, onOpenQueue, onIntelligenceMode }) => {
    const [showContactSelector, setShowContactSelector] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [viewMode, setViewMode] = useState('vinyl'); // 'vinyl' | 'lyrics'
    const [showComments, setShowComments] = useState(false);
    const { isEnabled: isListenTogether, toggle: toggleListenTogether } = useListenTogether();
    const { queue } = useAudio(); // Access queue for sharing

    // Animation Controls
    const controls = useAnimation();
    const dragY = useMotionValue(0);

    useEffect(() => {
        // Slide up on mount
        controls.start({ y: 0 });
    }, []);

    const handleClose = async () => {
        await controls.start({ y: '100%' });
        onClose();
    };

    const formatTime = (t) => {
        if (!t) return "0:00";
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleLike = async () => {
        const newState = !isLiked;
        setIsLiked(newState);
        try {
            await MusicService.like(track.id, newState);
        } catch (e) {
            console.error("Like failed", e);
            setIsLiked(!newState); // Revert on failure
        }
    };

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={controls}
            exit={{ y: '100%' }}
            style={{ y: dragY }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden font-sans bg-black/60 backdrop-blur-3xl"

            // Swipe Gestures (Down or Right to Close)
            drag
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={{ top: 0, bottom: 0.5, left: 0, right: 0.5 }}
            onDragEnd={(event, info) => {
                const isSwipeDown = info.offset.y > 150 || info.velocity.y > 500;
                const isSwipeRight = info.offset.x > 100 || info.velocity.x > 500;

                if (isSwipeDown || isSwipeRight) {
                    handleClose();
                } else {
                    controls.start({ x: 0, y: 0 });
                }
            }}
        >
            {/* Background Blurs */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-black/60 z-10" />
                <img
                    src={track.al?.picUrl}
                    className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-50 scale-150"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 z-20" />
            </div>

            {/* Header */}
            <div className="relative z-30 pt-[calc(env(safe-area-inset-top)+10px)] px-6 flex justify-between items-center text-white min-h-[64px]">
                <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors backdrop-blur-md">
                    <ChevronDown size={24} />
                </button>
                <div className="w-10" />
            </div>

            {/* Content (Vinyl/Lyrics) */}
            <div className="relative z-30 flex-1 flex flex-col items-center justify-center min-h-0" onClick={() => setViewMode(viewMode === 'vinyl' ? 'lyrics' : 'vinyl')}>
                <AnimatePresence mode="wait">
                    {viewMode === 'vinyl' ? (
                        <motion.div
                            key="vinyl"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full h-full flex items-center justify-center"
                        >
                            {/* Vinyl Disc */}
                            <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[#111] ring-4 ring-white/10 group">
                                <motion.div
                                    className="w-full h-full rounded-full overflow-hidden"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear", repeatType: "loop" }}
                                    style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                                >
                                    <div className="absolute inset-0 bg-[url('https://s3.music.126.net/mobile-new/img/disc.png')] bg-cover bg-center opacity-90" />
                                    <div className="absolute inset-[18%] rounded-full overflow-hidden border-4 border-[#111]">
                                        <img
                                            src={track.al?.picUrl}
                                            className="w-full h-full object-cover"
                                            alt="Cover"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="lyrics"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full h-full px-6 py-4"
                        >
                            <LyricsView songId={track.id} currentTime={progress} duration={duration} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer / Controls */}
            <div className="relative z-30 px-8 pb-12 space-y-8">

                {/* Info Row */}
                <div className="flex justify-between items-end">
                    <div className="flex-1 min-w-0 mr-4 space-y-1">
                        <div className="flex items-center space-x-2">
                            <h2 className="text-2xl font-bold text-white leading-tight truncate drop-shadow-md">
                                {track.name}
                            </h2>
                            {(track.sq || track.hr) && <span className="px-1 py-0.5 rounded text-[9px] border border-red-500 text-red-500 font-bold">SQ</span>}
                        </div>
                        <p className="text-lg text-white/70 truncate font-medium">
                            {track.ar?.map(a => a.name).join(' / ')}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 mb-1">
                        <button onClick={handleLike} className="p-2 active:scale-90 transition-transform">
                            <Heart size={28} className={isLiked ? "text-red-500 fill-red-500" : "text-white"} />
                        </button>
                        <button onClick={() => setShowComments(true)} className="p-2 active:scale-90 transition-transform text-white">
                            <MessageSquare size={26} />
                        </button>
                        <button
                            onClick={() => setShowContactSelector(true)}
                            className={`p-2 active:scale-90 transition-transform ${isListenTogether ? 'text-green-400' : 'text-white'}`}
                        >
                            <Headphones size={28} className={isListenTogether ? 'fill-current' : ''} />
                        </button>
                    </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden relative cursor-pointer hover:h-2 transition-all">
                        <div className="absolute inset-y-0 left-0 bg-white/90 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.8)]" style={{ width: `${(progress / duration) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-medium text-white/40 font-mono tracking-wide">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onToggleMode}
                        className={`p-2 transition-colors ${mode !== 'sequence' ? 'text-white' : 'text-white/40'}`}
                    >
                        {mode === 'shuffle' ? <Shuffle size={22} /> : <Repeat size={22} className={mode === 'loop' ? 'text-red-500' : ''} />}
                    </button>

                    <button onClick={onPrev} className="text-white hover:text-white/80 active:scale-90 transition-transform p-2">
                        <SkipBack size={36} fill="currentColor" />
                    </button>

                    <button
                        onClick={onTogglePlay}
                        className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.15)] active:scale-95 transition-transform hover:scale-105"
                    >
                        {isPlaying ? (
                            <Pause size={32} fill="currentColor" />
                        ) : (
                            <Play size={32} fill="currentColor" className="ml-1" />
                        )}
                    </button>

                    <button onClick={onNext} className="text-white hover:text-white/80 active:scale-90 transition-transform p-2">
                        <SkipForward size={36} fill="currentColor" />
                    </button>

                    <button onClick={onOpenQueue} className="text-white hover:text-white/80 active:scale-90 transition-transform p-2">
                        <ListMusic size={24} />
                    </button>
                </div>
            </div>

            {/* Comments Sheet */}
            <AnimatePresence>
                {showComments && (
                    <CommentSheet songId={track.id} onClose={() => setShowComments(false)} />
                )}
            </AnimatePresence>

            {/* Contact Selector for Listen Together */}
            <AnimatePresence>
                {showContactSelector && (
                    <ContactSelectorSheet
                        onClose={() => setShowContactSelector(false)}
                        onSelect={(convId) => {
                            setShowContactSelector(false);

                            // Determine Share Type
                            const isPlaylist = queue && queue.length > 1;
                            const shareData = {
                                title: isPlaylist ? `分享歌单 (${queue.length}首)` : track.name,
                                artist: isPlaylist ? '多个艺术家' : track.ar?.[0]?.name,
                                cover: track.al?.picUrl,
                                songId: track.id, // Current entry
                                type: isPlaylist ? 'playlist' : 'song',
                                playlist: isPlaylist ? queue : undefined
                            };

                            // Dispatch Share Event
                            const event = new CustomEvent('suki-app-share', {
                                detail: {
                                    targetApp: 'messenger',
                                    action: 'share-music',
                                    data: shareData,
                                    targetId: convId
                                }
                            });
                            window.dispatchEvent(event);

                            onClose(); // Minify Player

                            // Launch messenger with params
                            window.dispatchEvent(new CustomEvent('launch-app', {
                                detail: {
                                    appId: 'messenger',
                                    params: {
                                        action: 'share-music',
                                        data: shareData,
                                        targetId: convId
                                    }
                                }
                            }));
                        }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Player;
