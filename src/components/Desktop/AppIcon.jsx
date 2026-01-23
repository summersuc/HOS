import React from 'react';
import { motion } from 'framer-motion';
import { db } from '../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';

import { triggerHaptic } from '../../utils/haptics';

const AppIcon = ({ app, inDock = false, onClick }) => {
    // 读取用户覆写配置 (自定义图标/名称)
    const override = useLiveQuery(() => db.appOverrides.get(app.id));

    // 优先使用覆写数据
    const displayName = override?.name || app.name;
    const finalIcon = override?.icon || app.icon;

    // Haptic Click Handler
    const handleClick = (e) => {
        triggerHaptic();
        if (onClick) onClick(e);
    };

    return (
        <div className="flex flex-col items-center gap-1 group w-[60px] sm:w-[70px]">
            <motion.button
                whileTap={{ scale: 0.9 }}
                data-app-id={app.id}
                className={`relative aspect-square w-full rounded-2xl overflow-hidden shadow-icon ${inDock ? '' : 'bg-transparent'}`}
                onClick={handleClick}
            >
                {/* 
                   Render Logic
                   - Case A: User Override Image -> Show Image (cover)
                   - Case B: System Icon -> Show "Jelly Glass" Container (VisionOS Style)
                */}
                {(() => {
                    // Case A: User Override Image (String URL)
                    if (typeof finalIcon === 'string' && finalIcon.includes('/')) {
                        return (
                            <div className="absolute inset-0 bg-transparent">
                                <img src={finalIcon} alt={displayName} className="w-full h-full object-cover" />
                            </div>
                        );
                    }

                    // Case B: System Icon (Jelly Glass Style - CSS Recipe)
                    return (
                        <div
                            className="absolute inset-0 flex items-center justify-center transition-all bg-gradient-to-br from-white/40 via-white/10 to-white/5 dark:from-white/5 dark:via-white/[0.02] dark:to-transparent border border-white/20 dark:border-white/5"
                            style={{
                                // VisionOS Glass Recipe (Geometry & Effects)
                                backdropFilter: 'blur(12px) saturate(120%)',
                                WebkitBackdropFilter: 'blur(12px) saturate(120%)',
                                boxShadow: `
                                    inset 0 1px 0 0 rgba(255, 255, 255, var(--glass-highlight-opacity)),
                                    inset 0 -1px 0 0 rgba(255, 255, 255, var(--glass-border-opacity)),
                                    0 8px 20px -5px rgba(0, 0, 0, var(--glass-shadow-opacity))
                                `
                            }}
                        >
                            {(() => {
                                if (typeof finalIcon === 'function' || typeof finalIcon === 'object') {
                                    const IconComponent = finalIcon;
                                    // Symbol: Dark Gray (Light) / White (Dark) + Drop Shadow
                                    return (
                                        <div style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
                                            <IconComponent className="text-gray-700 dark:text-white" size={32} strokeWidth={2} />
                                        </div>
                                    );
                                }
                                return (
                                    <span
                                        className="text-2xl font-bold text-gray-700 dark:text-white"
                                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    >
                                        {displayName[0]}
                                    </span>
                                );
                            })()}
                        </div>
                    );
                })()}
            </motion.button>

            {!inDock && (
                <span className="text-xs text-gray-700 dark:text-gray-100 font-medium truncate max-w-full text-center tracking-wide drop-shadow-sm select-none">
                    {displayName}
                </span>
            )}
        </div>
    );
};

export default AppIcon;
