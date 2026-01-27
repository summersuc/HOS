import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Settings, Palette, User, Bot } from 'lucide-react';
import { Plus, Check, ChevronRight, Sparkles } from '../icons';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import { storageService } from '../../../services/StorageService';
import { motion, AnimatePresence } from 'framer-motion';

const MeTab = ({ onEditPersona, onNewPersona, onOpenSettings, onOpenBeautify }) => {
    const personas = useLiveQuery(() => db.userPersonas.toArray());
    const activePersona = personas?.find(p => p.isActive);

    // Force re-render when storage cache updates
    const [storageVersion, setStorageVersion] = useState(0);
    useEffect(() => {
        return storageService.subscribe(() => setStorageVersion(v => v + 1));
    }, []);

    // Optimistic UI state
    const [optimisticActiveId, setOptimisticActiveId] = useState(null);
    const [isActivating, setIsActivating] = useState(false);

    // Determine effective active persona (optimistic or real)
    const effectiveActiveId = optimisticActiveId ?? activePersona?.id;
    const effectiveActivePersona = personas?.find(p => p.id === effectiveActiveId) || activePersona;

    // Avatar display logic
    const displayAvNumber = useMemo(() => {
        const id = effectiveActivePersona?.id;
        if (!id) return null;

        const cached = storageService.getCachedBlobUrl('userPersonas', id);
        if (cached) return cached;

        if (effectiveActivePersona?.avatar instanceof Blob) {
            return URL.createObjectURL(effectiveActivePersona.avatar);
        }
        return effectiveActivePersona?.avatar;
    }, [effectiveActivePersona?.id, effectiveActivePersona?.avatar, storageVersion]);

    // Cleanup optimistic state when DB catches up
    useEffect(() => {
        if (optimisticActiveId && activePersona?.id === optimisticActiveId) {
            setOptimisticActiveId(null);
            setIsActivating(false);
        }
    }, [activePersona?.id, optimisticActiveId]);

    // Smooth persona switching with debounce
    const handleActivate = useCallback(async (personaId) => {
        if (isActivating || personaId === effectiveActiveId) return;

        triggerHaptic();
        setOptimisticActiveId(personaId);
        setIsActivating(true);

        try {
            await db.transaction('rw', db.userPersonas, async () => {
                await db.userPersonas.toCollection().modify({ isActive: false });
                await db.userPersonas.update(personaId, { isActive: true });
            });
        } catch (e) {
            console.error('Activate failed:', e);
            setOptimisticActiveId(null);
        } finally {
            setIsActivating(false);
        }
    }, [isActivating, effectiveActiveId]);

    // Get avatar for list item
    const getPersonaAvatar = useCallback((persona) => {
        const cached = storageService.getCachedBlobUrl('userPersonas', persona.id);
        if (cached) return cached;
        if (persona.avatar instanceof Blob) return URL.createObjectURL(persona.avatar);
        return persona.avatar;
    }, [storageVersion]);

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-[#F2F2F7] dark:from-black dark:to-black">
            {/* Header - V3 Soft Gradient Blur */}
            <div className="shrink-0 relative z-30">
                <div
                    className="absolute top-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-b from-gray-50/95 to-transparent dark:from-black/90 dark:to-transparent backdrop-blur-xl"
                    style={{
                        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                    }}
                />
                <div className="relative pt-[var(--sat)] h-[calc(56px+var(--sat))] flex items-center px-5">
                    <h1 className="text-[32px] font-bold text-gray-900 dark:text-gray-200 tracking-tight">我</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* User Card - Premium Design */}
                <motion.div
                    className="mx-4 mt-5 relative overflow-hidden rounded-3xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* 背景渐变层 - 白灰色 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 via-white/30 to-gray-200/50 dark:from-gray-800/30 dark:via-gray-700/20 dark:to-gray-800/30" />

                    {/* 毛玻璃内容层 */}
                    <div className="relative bg-white/75 dark:bg-[#1C1C1E]/75 backdrop-blur-2xl rounded-3xl p-6 border border-white/50 dark:border-white/10 shadow-xl">
                        <div className="flex items-center gap-4">
                            {/* 头像外圈光环 - 高级白灰色 */}
                            <motion.div
                                className="relative"
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 via-white to-gray-300 dark:from-gray-600 dark:via-gray-500 dark:to-gray-700 p-[3px] shadow-xl animate-pulse">
                                    <div className="w-full h-full rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center overflow-hidden">
                                        {displayAvNumber ? (
                                            <motion.img
                                                key={displayAvNumber}
                                                src={displayAvNumber}
                                                className="w-full h-full object-cover"
                                                alt=""
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        ) : (
                                            <Bot size={32} className="text-gray-300" strokeWidth={1.5} />
                                        )}
                                    </div>
                                </div>
                                {/* Status indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-green-500 border-[3px] border-white dark:border-[#1C1C1E] rounded-full shadow-lg" />
                            </motion.div>

                            {/* 用户信息 */}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-[24px] font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent truncate">
                                    {effectiveActivePersona?.userName || '用户'}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Bot size={14} className="text-gray-600 dark:text-gray-400 shrink-0" strokeWidth={2} />
                                    <p className="text-[14px] text-gray-600 dark:text-gray-400 truncate">
                                        {effectiveActivePersona?.name || '默认人设'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Persona List - Enhanced */}
                <div className="mx-4 mt-6">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">我的人设</span>
                        <span className="text-[11px] text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{personas?.length || 0} 个</span>
                    </div>
                    <div className="bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl rounded-3xl overflow-hidden shadow-md border border-gray-200/50 dark:border-white/8">
                        <AnimatePresence>
                            {personas?.map((persona, index) => {
                                const isActive = persona.id === effectiveActiveId;
                                const avatarUrl = getPersonaAvatar(persona);

                                return (
                                    <motion.div
                                        key={persona.id}
                                        layout
                                        className="flex items-center gap-3.5 px-4 py-4 cursor-pointer active:bg-gray-50/50 dark:active:bg-white/5 transition-colors"
                                        style={{ borderBottom: index < personas.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}
                                    >
                                        {/* Selection Button */}
                                        <motion.button
                                            onClick={() => handleActivate(persona.id)}
                                            disabled={isActivating}
                                            animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                                            transition={{ duration: 0.3 }}
                                            whileTap={{ scale: 0.85 }}
                                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all 
                                                ${isActive
                                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-transparent shadow-lg shadow-blue-500/30'
                                                    : 'border-gray-300 dark:border-gray-600'
                                                }`}
                                        >
                                            {isActive && <Check size={14} strokeWidth={3} className="text-white" />}
                                        </motion.button>

                                        {/* Avatar Thumbnail */}
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 p-0.5 overflow-hidden shrink-0">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} className="w-full h-full object-cover rounded-2xl" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E]">
                                                    <Bot size={20} className="text-gray-400" strokeWidth={1.5} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0" onClick={() => { triggerHaptic(); onEditPersona(persona.id); }}>
                                            <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white truncate">{persona.userName || persona.name || '未命名'}</h3>
                                            <p className="text-[12px] text-gray-400 truncate mt-0.5">
                                                {persona.description?.slice(0, 40) || '暂无人设描述'}
                                            </p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 shrink-0" />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Add New */}
                        <motion.div
                            onClick={() => { triggerHaptic(); onNewPersona(); }}
                            className="flex items-center gap-3.5 px-4 py-4 cursor-pointer active:bg-gray-50/50 dark:active:bg-white/5 transition-colors border-t border-gray-100 dark:border-white/5"
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <Plus size={12} className="text-gray-400" />
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Plus size={20} className="text-gray-400" />
                            </div>
                            <span className="text-[15px] text-gray-600 dark:text-gray-300 font-semibold">新建人设</span>
                        </motion.div>
                    </div>
                </div>

                {/* Settings Section - Enhanced */}
                <div className="mx-4 mt-6 mb-8">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">设置</span>
                    </div>
                    <div className="bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl rounded-3xl overflow-hidden shadow-md border border-gray-200/50 dark:border-white/8">
                        <motion.div
                            onClick={() => { triggerHaptic(); onOpenSettings(); }}
                            className="flex items-center gap-4 px-4 py-4 cursor-pointer active:bg-gray-50/50 dark:active:bg-white/5 transition-colors"
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                                <Settings size={20} className="text-gray-600 dark:text-gray-300" />
                            </div>
                            <div className="flex-1">
                                <span className="font-medium text-[16px] text-gray-900 dark:text-white">大脑连接 (API)</span>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </motion.div>

                        <div className="h-px bg-gray-100 dark:bg-white/5 mx-4" />

                        <motion.div
                            onClick={() => { triggerHaptic(); onOpenBeautify?.(); }}
                            className="flex items-center gap-4 px-4 py-4 cursor-pointer active:bg-gray-50/50 dark:active:bg-white/5 transition-colors"
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                                <Palette size={20} className="text-gray-600 dark:text-gray-300" />
                            </div>
                            <div className="flex-1">
                                <span className="font-medium text-[16px] text-gray-900 dark:text-white">美化仓库</span>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeTab;
