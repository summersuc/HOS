import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ClockWidget = ({ settings }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const day = time.toLocaleDateString('zh-CN', { weekday: 'long', month: 'short', day: 'numeric' });

    // Design: Neon Gradient
    return (
        <div className="w-full h-full rounded-[25px] overflow-hidden relative flex flex-col items-center justify-center text-white shadow-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Glass shine */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="text-5xl font-bold tracking-tight drop-shadow-md font-[var(--system-font)]">
                    {hours}<span className="animate-pulse">:</span>{minutes}
                </div>
                <div className="text-xs font-medium mt-1 opacity-90 tracking-wider uppercase">
                    {day}
                </div>
            </div>
        </div>
    );
};

export default ClockWidget;
