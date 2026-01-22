import React from 'react';
import { Plus, Check, Settings, ChevronRight, Sparkles, Palette } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';

const MeTab = ({ onEditPersona, onNewPersona, onOpenSettings, onOpenBeautify }) => {
    const personas = useLiveQuery(() => db.userPersonas.toArray());
    const activePersona = personas?.find(p => p.isActive);

    const handleActivate = async (personaId) => {
        triggerHaptic();

        // Override UI Pattern: Force show the new avatar immediately
        // This prevents the "flash of old/empty content" while DB syncs
        const targetPersona = personas.find(p => p.id === personaId);
        if (targetPersona) {
            // Determine the URL/Source to force display
            let overrideSrc;
            if (targetPersona.avatar instanceof Blob) {
                overrideSrc = URL.createObjectURL(targetPersona.avatar);
            } else {
                overrideSrc = targetPersona.avatar;
            }
            setOverrideAvatar({ id: personaId, src: overrideSrc });
        }

        await db.transaction('rw', db.userPersonas, async () => {
            await db.userPersonas.toCollection().modify({ isActive: false });
            await db.userPersonas.update(personaId, { isActive: true });
        });
    };

    // Avatar Logic: Override > Reference > DB Source
    const [overrideAvatar, setOverrideAvatar] = React.useState(null);

    // Sync Effect: When DB catches up to our override, release the override
    React.useEffect(() => {
        if (overrideAvatar && activePersona?.id === overrideAvatar.id) {
            // DB has synced to the active persona we clicked.
            // We can now safely release the override and let DB take over.
            // Small timeout to ensure image paint is effectively "swapped"
            const timer = setTimeout(() => {
                setOverrideAvatar(null);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [activePersona?.id, overrideAvatar]);

    // Cleanup Blob URLs from overrides to stop memory leaks
    React.useEffect(() => {
        return () => {
            if (overrideAvatar?.src && overrideAvatar.src.startsWith('blob:')) {
                URL.revokeObjectURL(overrideAvatar.src);
            }
        };
    }, [overrideAvatar]);

    // Determine what to display
    const displayAvatar = overrideAvatar?.src || (
        activePersona?.avatar instanceof Blob
            ? URL.createObjectURL(activePersona.avatar)
            : activePersona?.avatar
    );

    return (
        <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-black">
            {/* Header */}
            <div className="shrink-0 pt-[var(--sat)] bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/5">
                <div className="h-[56px] flex items-center px-4">
                    <h1 className="text-[28px] font-bold text-gray-900 dark:text-white tracking-tight">我</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* User Card */}
                <div className="mx-4 mt-4 bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-[#5B7FFF]/20 to-[#5B7FFF]/10 dark:from-[#5B7FFF]/30 dark:to-[#5B7FFF]/20 flex items-center justify-center text-[#5B7FFF] text-3xl font-bold shadow-inner overflow-hidden">
                            {displayAvatar ? (
                                <img src={displayAvatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                                activePersona?.userName?.[0] || 'U'
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-[22px] font-bold text-gray-900 dark:text-white">{activePersona?.userName || '用户'}</h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Sparkles size={12} className="text-[#5B7FFF]" />
                                <p className="text-[13px] text-gray-500">{activePersona?.name || '默认人设'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Persona List */}
                <div className="mx-4 mt-5">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">我的人设</span>
                        <span className="text-[11px] text-gray-400">{personas?.length || 0} 个</span>
                    </div>
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
                        {personas?.map((persona, index) => (
                            <div
                                key={persona.id}
                                className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
                                style={{ borderBottom: index < personas.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}
                            >
                                <button
                                    onClick={() => handleActivate(persona.id)}
                                    className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${persona.isActive
                                        ? 'bg-[#5B7FFF] border-[#5B7FFF] shadow-lg shadow-[#5B7FFF]/25'
                                        : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    {persona.isActive && <Check size={12} className="text-white" strokeWidth={3} />}
                                </button>
                                <div className="flex-1 cursor-pointer" onClick={() => { triggerHaptic(); onEditPersona(persona.id); }}>
                                    <h3 className="font-medium text-[15px] text-gray-900 dark:text-white">{persona.userName || persona.name || '未命名'}</h3>
                                    <p className="text-[12px] text-gray-400 truncate mt-0.5">
                                        {persona.description?.slice(0, 40) || '暂无人设描述'}
                                    </p>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </div>
                        ))}

                        {/* Add New */}
                        <div onClick={() => { triggerHaptic(); onNewPersona(); }} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors">
                            <div className="w-[22px] h-[22px] rounded-full border-2 border-dashed border-[#5B7FFF]/50 flex items-center justify-center">
                                <Plus size={12} className="text-[#5B7FFF]" />
                            </div>
                            <span className="text-[15px] text-[#5B7FFF] font-medium">新建人设</span>
                        </div>
                    </div>
                </div>

                {/* Settings Section */}
                <div className="mx-4 mt-5 mb-8">
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
                        <div onClick={() => { triggerHaptic(); onOpenSettings(); }} className="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/20">
                                <Settings size={22} className="text-white" />
                            </div>
                            <span className="flex-1 font-medium text-[15px] text-gray-900 dark:text-white">聊天设置</span>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>

                        {/* Beautify Entry */}
                        <div onClick={() => { triggerHaptic(); onOpenBeautify?.(); }} className="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors border-t border-gray-100 dark:border-white/5">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-400/20">
                                <Palette size={22} className="text-white" />
                            </div>
                            <span className="flex-1 font-medium text-[15px] text-gray-900 dark:text-white">美化仓库</span>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeTab;
