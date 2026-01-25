import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * 翻译气泡组件
 * @param {string} content - 翻译内容
 * @param {string} originalContent - 原文内容 (用于合并模式)
 * @param {string} mode - 显示模式: 'inside' | 'outside' | 'click'
 * @param {string} userSide - 'left' (AI) or 'right' (User) - usually AI is left
 */
const TranslationBubble = ({ content, mode = 'inside', isUser = false }) => {
    const [isVisible, setIsVisible] = useState(mode !== 'click');

    // Reuse base bubble styles from ChatDetail
    // AI: bg-white/90 dark:bg-[#1C1C1E]/90
    // User: bg-blue-500
    // We want translation to look slightly distinct but consistent

    // Logic:
    // If 'inside': it renders nicely attached to the original text (handled by parent preferably, but if standalone, we make it look attached)
    // If 'outside': renders as a separate block
    // If 'click': renders a toggle button first

    // Actually, to make 'inside' mode look good, the parent ChatDetail usually renders text THEN this. 
    // We will assume this component IS the translation part.

    const toggleVisibility = (e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
    };

    // Shared style classes
    const bubbleBase = `relative text-[14px] leading-snug transition-all rounded-2xl max-w-full`;
    const aiStyle = "bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl text-gray-900 dark:text-white border border-gray-200/50 dark:border-white/10 shadow-sm";

    if (mode === 'click' && !isVisible) {
        return (
            <div
                onClick={toggleVisibility}
                className="flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-gray-100/50 dark:bg-white/5 rounded-full cursor-pointer hover:bg-gray-200/50 dark:hover:bg-white/10 transition-colors w-fit"
            >
                <Languages size={13} className="opacity-60" />
                <span className="text-[11px] opacity-60 font-medium">查看翻译</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={mode === 'click' ? { opacity: 0, height: 0 } : false}
            animate={{ opacity: 1, height: 'auto' }}
            className={`flex flex-col gap-1 mt-1 ${mode === 'inside' ? 'pt-2 border-t border-black/5 dark:border-white/10' : ''}`}
        >
            {/* Header for Click Mode or specific visual cue */}
            {mode === 'click' && (
                <div onClick={toggleVisibility} className="flex items-center gap-1 mb-1 cursor-pointer opacity-50 hover:opacity-100">
                    <Languages size={12} />
                    <span className="text-[10px]">翻译内容</span>
                    <ChevronUp size={12} />
                </div>
            )}

            <div className={`whitespace-pre-wrap break-words text-[14px] ${mode === 'inside' ? 'opacity-90' : ''}`}>
                {content}
            </div>
        </motion.div>
    );
};

export default TranslationBubble;
