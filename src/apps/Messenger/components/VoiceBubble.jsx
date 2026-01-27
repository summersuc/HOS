import React, { useState } from 'react';
import { Mic, Volume2 } from 'lucide-react';

const VoiceBubble = ({ content, duration = 3, isUser, borderRadius }) => {
    const [showText, setShowText] = useState(false);

    // Calculate width based on duration (min 80px, max 200px)
    // 1s -> 80px, 60s -> 220px
    const minWidth = 80;
    const maxWidth = 220;
    const width = Math.min(maxWidth, Math.max(minWidth, minWidth + (duration * 3)));

    const defaultRadius = isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
    const finalRadius = borderRadius || defaultRadius;

    return (
        <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setShowText(!showText);
                }}
                className={`
                    cursor-pointer select-none active:opacity-70 transition-all duration-200
                    flex items-center gap-2 px-3 py-2.5 ${finalRadius}
                    ${isUser
                        ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 dark:from-transparent dark:via-transparent dark:to-transparent dark:bg-[#3A3A3C] text-white dark:text-gray-200 shadow-md shadow-blue-500/20 dark:shadow-none dark:border dark:border-white/10 flex-row-reverse'
                        : 'bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl text-gray-900 dark:text-white border border-gray-200/50 dark:border-white/10 shadow-sm'
                    }
                `}
                style={{ width: `${width}px` }}
            >
                {/* Icon */}
                <Volume2 size={18} className={`shrink-0 ${isUser ? 'rotate-180' : ''}`} />

                {/* Duration */}
                <span className="text-sm font-medium opacity-90 flex-1 text-right sm:text-left">
                    {duration}"
                </span>

                {/* Red dot for unread? (Optional, skipping for now as it's pseudo) */}
            </div>

            {/* Revealed Text */}
            {showText && (
                <div
                    className={`
                        text-[15px] px-3 py-2 leading-snug max-w-full break-words mt-1 shadow-sm ${finalRadius}
                        ${isUser
                            ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 dark:from-transparent dark:via-transparent dark:to-transparent dark:bg-[#3A3A3C] text-white dark:text-gray-200 shadow-blue-500/20 dark:shadow-none dark:border dark:border-white/10'
                            : 'bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl text-gray-900 dark:text-white border border-gray-200/50 dark:border-white/10'
                        }
                    `}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Parse content for bilingual display */}
                    {(() => {
                        // Support both old "|||" format and new "原文（翻译）" format
                        if (content.includes('|||')) {
                            const [orig, trans] = content.split('|||').map(s => s.trim());
                            return (
                                <div className="flex flex-col gap-1">
                                    <span>{orig}</span>
                                    <span className={`text-[13px] ${isUser ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'} border-t ${isUser ? 'border-white/20' : 'border-black/5 dark:border-white/10'} pt-1 mt-0.5`}>
                                        {trans}
                                    </span>
                                </div>
                            );
                        }
                        // New format: 原文（翻译）
                        const match = content.match(/^(.+?)（(.+?)）$/);
                        if (match) {
                            return (
                                <div className="flex flex-col gap-1">
                                    <span>{match[1].trim()}</span>
                                    <span className={`text-[13px] ${isUser ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'} border-t ${isUser ? 'border-white/20' : 'border-black/5 dark:border-white/10'} pt-1 mt-0.5`}>
                                        {match[2].trim()}
                                    </span>
                                </div>
                            );
                        }
                        return content;
                    })()}
                </div>
            )}
        </div>
    );
};

export default VoiceBubble;
