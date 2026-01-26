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
        <div className={`flex flex-col items-center gap-1 group ${inDock ? 'w-[50px] sm:w-[60px]' : 'w-[60px] sm:w-[70px]'}`}>
            <motion.button
                whileTap={{ scale: 0.9 }}
                data-app-id={app.id}
                className={`relative aspect-square w-full ${inDock ? 'rounded-[16px]' : 'rounded-[22px]'} overflow-hidden shadow-icon ${inDock ? '' : 'bg-transparent'}`}
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
                            className="absolute inset-0 flex items-center justify-center transition-all bg-gradient-to-br from-white/[0.05] via-transparent to-transparent dark:from-white/[0.01] dark:via-transparent dark:to-transparent border border-white/5 dark:border-white/[0.02]"
                            style={{
                                // Ultra-Thin Glass Recipe
                                backdropFilter: 'blur(4px) saturate(110%)',
                                WebkitBackdropFilter: 'blur(4px) saturate(110%)',
                                boxShadow: `
                                    inset 0 1px 0 0 rgba(255, 255, 255, 0.05),
                                    inset 0 -1px 0 0 rgba(255, 255, 255, 0.02),
                                    0 4px 12px -2px rgba(0, 0, 0, 0.05)
                                `
                            }}
                        >
                            {(() => {
                                if (typeof finalIcon === 'function' || typeof finalIcon === 'object') {
                                    const IconComponent = finalIcon;
                                    // Symbol: Professional Gray (Light) / Silver Gray (Dark) + Drop Shadow
                                    return (
                                        <div style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>
                                            <IconComponent className="text-[#8E8E93] dark:text-[#AEAEB2]" size={32} strokeWidth={2.5} />
                                        </div>
                                    );
                                }
                                return (
                                    <span
                                        className="text-2xl font-bold text-[#8E8E93] dark:text-[#AEAEB2]"
                                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
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
