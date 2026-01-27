import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Smart Bilingual Bubble Content Wrapper (V4)
 * Handles "Split" (Outside) vs "Merged" (Inside) rendering state internally.
 * Uses sessionStorage to persist "Expanded" state for Click interaction.
 * 
 * V4 Changes:
 * - Removed "查看翻译" button (user clicks bubble to toggle)
 * - Translation bubble now fully copies original bubble style
 * - Cleaner layout for split mode
 * 
 * @param {Object} props
 * @param {Object} props.msg - Message object
 * @param {React.ReactNode} props.children - Original main content (text/rich)
 * @param {Object} props.translationMode - { enabled, style, interaction }
 * @param {string} props.visualClass - The style class for the bubble (used for both original and translation)
 * @param {boolean} props.isUser
 */
const BilingualSmartBubble = ({ msg, children, translationMode, visualClass, isUser }) => {
    // 1. Resolve Configuration
    const { style = 'merged', interaction = 'always' } = translationMode || {};
    const translation = msg.metadata?.translation;

    // 2. Resolve Visibility State (Transition memory)
    // Default: 'always' -> true. 'click' -> false.
    const [isExpanded, setIsExpanded] = useState(() => {
        return interaction === 'always';
    });

    // Update state when interaction mode changes (Force sync for initial load)
    useEffect(() => {
        if (interaction === 'always') {
            setIsExpanded(true);
        } else if (interaction === 'click') {
            setIsExpanded(false); // Force close when switching to (or loading) click mode
        }
    }, [interaction]);

    const toggleExpand = (e) => {
        e.stopPropagation();
        if (interaction === 'always') return; // Ignore click if always visible
        setIsExpanded(!isExpanded);
    };

    // If no translation or disabled, just return children in a stable wrapper
    if (!translation || !translationMode?.enabled) {
        return <div className="flex flex-col w-full">{children}</div>;
    }

    // Ensure inner bubbles don't get double max-width constrained
    // The parent wrapper (in ChatDetail) already handles max-w-[68%]
    const innerVisualClass = visualClass.replace('max-w-[68%]', 'w-full');

    // 3. Layout Logic
    return (
        <div className="flex flex-col w-full">
            {/* Split Mode (Outside) - Two separate bubbles */}
            {style === 'split' ? (
                <>
                    {/* Original content - clickable if click mode */}
                    <div
                        onClick={interaction === 'click' ? toggleExpand : undefined}
                        className={`${innerVisualClass} ${interaction === 'click' ? 'cursor-pointer' : ''}`}
                    >
                        {children}
                    </div>

                    {/* Translation bubble - fully copies original bubble style */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={interaction === 'always' ? false : { opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.2 }}
                                className={`mt-1.5 ${isUser ? 'self-end' : 'self-start'} w-full`} // Ensure wrapper is full width relative to parent
                            >
                                <div
                                    className={innerVisualClass}
                                    onClick={interaction === 'click' ? toggleExpand : undefined}
                                >
                                    <div className="whitespace-pre-wrap break-words">
                                        {translation}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            ) : (
                /* Merged Mode (Inside) - Single bubble with translation inside */
                <div
                    onClick={interaction === 'click' ? toggleExpand : undefined}
                    className={interaction === 'click' ? 'cursor-pointer' : ''}
                >
                    {children}

                    {/* Translation section inside the same bubble */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={interaction === 'always' ? false : { opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden w-full"
                            >
                                <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 w-full">
                                    <div className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed opacity-90 whitespace-pre-wrap break-words">
                                        {translation}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default BilingualSmartBubble;
