import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useDragControls, useAnimation } from 'framer-motion';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, ListMusic, Heart } from 'lucide-react';
import { MusicService } from '../../../services/MusicService';

const Player = ({ track, isPlaying, progress, duration, onTogglePlay, onClose, onNext, onPrev, mode, onToggleMode }) => {
    const [isLiked, setIsLiked] = useState(false);

    // Drag controls for swipe-to-close
    const x = useMotionValue(0);
    const dragControls = useDragControls();
    const controls = useAnimation();

    // Reset like state on track change (In real app, we'd check if liked)
    useEffect(() => {
        setIsLiked(false);
    }, [track?.id]);

    if (!track) return null;

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

    // Handle drag end for swipe-back gesture
    const handleDragEnd = async (event, info) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // Threshold: > 80px or fast swipe > 300px/s
        if (offset > 80 || velocity > 300) {
            // Animate out smoothly then close
            await controls.start({
                x: "100%",
                transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] }
            });
            onClose();
        } else {
            // Snap back
            controls.start({
                x: 0,
                transition: { type: "spring", stiffness: 400, damping: 40 }
            });
        }
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.8 }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden font-sans bg-black/40 backdrop-blur-3xl"
            style={{ x, willChange: "transform" }}

            // Horizontal drag for swipe-back
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.5 }}
            onDragEnd={handleDragEnd}
            dragListener={false}
            dragControls={dragControls}
        >
            {/* --- Glass Background --- */}
            <div className="absolute inset-0 z-[-1]">
                <img
                    src={track.al?.picUrl}
                    className="w-full h-full object-cover opacity-60 blur-[100px] scale-150"
                    alt="bg"
                />
                <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* --- Edge Swipe Hit Area (Left side) --- */}
            <div
                className="absolute left-0 top-0 bottom-0 w-10 z-50 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: 'none' }}
            />

            {/* --- Header --- */}
            <div className="relative z-10 pt-4 px-6 flex justify-between items-center text-white">
                <button onClick={onClose} className="p-2 -ml-2 active:scale-90 transition opacity-80 hover:opacity-100">
                    <ChevronDown size={32} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">正在播放</span>
                </div>
                {/* Placeholder for Lyrics/Details toggle if needed */}
                <div className="w-8" />
            </div>

            {/* --- Vinyl / Cover Area --- */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-6">

                {/* Needle Arm */}
                <motion.div
                    animate={{ rotate: isPlaying ? 0 : -25 }}
                    className="absolute top-0 left-1/2 ml-[-12px] w-24 h-40 z-20 origin-[12px_12px] pointer-events-none transition-transform duration-500 ease-in-out"
                    style={{ left: '50%', marginLeft: '10px', transformOrigin: '12px 12px' }}
                >
                    <img src="https://s3.music.126.net/mobile-new/img/needle-ab.png" className="w-[100px] h-[160px] object-contain" />
                </motion.div>

                {/* Rotating Vinyl */}
                <motion.div
                    className="relative w-[320px] h-[320px] rounded-full ring-8 ring-white/5 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] bg-[#111] overflow-hidden"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear", repeatType: "loop" }}
                    style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                >
                    {/* Vinyl Disc Background */}
                    <div className="absolute inset-0 bg-[url('https://s3.music.126.net/mobile-new/img/disc.png')] bg-cover bg-center opacity-100" />

                    {/* Album Art */}
                    <div className="absolute inset-[18%] rounded-full overflow-hidden">
                        <img
                            src={track.al?.picUrl}
                            className="w-full h-full object-cover"
                            alt="Cover"
                        />
                    </div>
                </motion.div>
            </div>

            {/* --- Info & Controls --- */}
            <div className="relative z-10 px-8 pb-12 space-y-8">

                {/* Title & Artist */}
                <div className="flex justify-between items-end">
                    <div className="flex flex-col min-w-0 pr-4">
                        <h2 className="text-2xl font-bold text-white leading-tight truncate">
                            {track.name}
                        </h2>
                        <span className="text-lg text-white/60 truncate font-medium mt-1">
                            {track.ar?.map(a => a.name).join(', ')}
                        </span>
                    </div>
                    <button
                        onClick={handleLike}
                        className={`flex-shrink-0 p-3 rounded-full transition-colors active:scale-95 ${isLiked ? 'text-red-500' : 'text-white/40'}`}
                    >
                        <Heart size={28} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 group">
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden relative cursor-pointer group-hover:h-1.5 transition-all">
                        <motion.div
                            className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                            style={{ width: `${(progress / duration) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] font-medium text-white/40 font-mono">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onToggleMode}
                        className={`transition active:scale-90 ${mode !== 'sequence' ? 'text-white' : 'text-white/40'}`}
                    >
                        {mode === 'shuffle' ? <Shuffle size={20} /> : <Repeat size={20} className={mode === 'loop' ? 'text-red-500' : ''} />}
                        {mode === 'loop' && <span className="absolute text-[8px] font-bold -mt-2 ml-3">1</span>}
                    </button>

                    <button onClick={onPrev} className="text-white hover:text-white/80 active:scale-90 transition">
                        <SkipBack size={32} fill="currentColor" />
                    </button>

                    <button
                        onClick={onTogglePlay}
                        className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all hover:scale-105"
                    >
                        {isPlaying ? (
                            <Pause size={32} fill="currentColor" />
                        ) : (
                            <Play size={32} fill="currentColor" className="ml-1" />
                        )}
                    </button>

                    <button onClick={onNext} className="text-white hover:text-white/80 active:scale-90 transition">
                        <SkipForward size={32} fill="currentColor" />
                    </button>

                    <button className="text-white/40 hover:text-white active:scale-90 transition">
                        <ListMusic size={20} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default Player;
