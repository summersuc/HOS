import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const AuroraBackground = ({ src }) => {
    // We use multiple layers of the album art with different blur, scale, and animation
    // to create a fluid, "aurora-like" lighting effect that matches the song's vibe.

    return (
        <div className="absolute inset-0 z-[-1] overflow-hidden bg-black">
            {/* Base dark layer */}
            <div className="absolute inset-0 bg-black/40 z-10" />

            {/* Layer 1: Slow rotating giant blur */}
            <motion.div
                className="absolute inset-[-50%] z-0 opacity-60"
                animate={{
                    rotate: [0, 360],
                    scale: [1.5, 1.8, 1.5]
                }}
                transition={{
                    duration: 40,
                    repeat: Infinity,
                    ease: "linear"
                }}
            >
                <img
                    src={src}
                    className="w-full h-full object-cover blur-[80px]"
                    alt=""
                />
            </motion.div>

            {/* Layer 2: Counter-rotating drifting splashes */}
            <motion.div
                className="absolute inset-[-20%] z-0 opacity-40 mix-blend-overlay"
                animate={{
                    rotate: [360, 0],
                    x: [-20, 20, -20],
                    y: [-20, 20, -20]
                }}
                transition={{
                    rotate: { duration: 50, repeat: Infinity, ease: "linear" },
                    x: { duration: 20, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: 25, repeat: Infinity, ease: "easeInOut" }
                }}
            >
                <img
                    src={src}
                    className="w-full h-full object-cover blur-[60px] saturate-150"
                    alt=""
                />
            </motion.div>

            {/* Layer 3: Pulse */}
            <motion.div
                className="absolute inset-0 z-0 opacity-30 mix-blend-color-dodge"
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <img
                    src={src}
                    className="w-full h-full object-cover blur-[100px]"
                    alt=""
                />
            </motion.div>
        </div>
    );
};

export default AuroraBackground;
