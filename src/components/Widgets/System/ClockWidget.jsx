import React, { useState, useEffect } from 'react';
import WidgetBase from '../WidgetBase';
import { WIDGET_SIZES } from '../registry';

const ClockWidget = ({ settings, size = WIDGET_SIZES.SMALL }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');

    // Date formats
    const dayName = time.toLocaleDateString('zh-CN', { weekday: 'long' });
    const fullDate = time.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

    // Styles based on size
    const isMedium = size === WIDGET_SIZES.MEDIUM;
    const isWideSmall = size === WIDGET_SIZES.WIDE_SMALL;

    return (
        <WidgetBase variant="glass" className="bg-gradient-to-br from-indigo-500/80 via-purple-500/80 to-pink-500/80 text-white">
            <div className="w-full h-full flex flex-col items-center justify-center relative z-10 p-2">
                {/* Time */}
                <div className={`font-bold tracking-tight font-[var(--system-font)] drop-shadow-lg flex items-baseline ${isMedium ? 'text-6xl' : 'text-5xl'}`}>
                    <span>{hours}</span>
                    <span className="animate-pulse mx-1">:</span>
                    <span>{minutes}</span>
                    {isMedium && <span className="text-2xl ml-2 opacity-60 font-medium">{seconds}</span>}
                </div>

                {/* Date - Conditional Layout */}
                {!isWideSmall && (
                    <div className="text-xs font-medium mt-1 opacity-90 tracking-wider flex items-center gap-2">
                        <span>{dayName}</span>
                        {isMedium && <><span>|</span><span>{fullDate}</span></>}
                    </div>
                )}
            </div>

            {/* Simple Shine Effect */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 blur-xl pointer-events-none" />
        </WidgetBase>
    );
};

export default ClockWidget;
