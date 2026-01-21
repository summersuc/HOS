import React from 'react';
import { Book, Sliders, ChevronRight, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../../utils/haptics';

const DiscoverTab = ({ onOpenWorldBook, onOpenPresets }) => {
    const items = [
        {
            id: 'worldbook',
            icon: Book,
            label: '世界书',
            desc: '管理触发词条和背景设定',
            gradient: 'from-violet-500 to-purple-600',
            shadow: 'shadow-violet-500/25',
            action: onOpenWorldBook
        },
        {
            id: 'presets',
            icon: Sliders,
            label: 'Prompt 预设',
            desc: '自定义提示词编排顺序',
            gradient: 'from-[#5B7FFF] to-blue-600',
            shadow: 'shadow-[#5B7FFF]/25',
            action: onOpenPresets
        },
    ];

    return (
        <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-black">
            {/* Header */}
            <div className="shrink-0 pt-[var(--sat)] bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/5">
                <div className="h-[56px] flex items-center px-4">
                    <h1 className="text-[28px] font-bold text-gray-900 dark:text-white tracking-tight">发现</h1>
                </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map(item => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.id}
                            onClick={() => { triggerHaptic(); item.action(); }}
                            className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-4 shadow-sm cursor-pointer active:scale-[0.98] transition-all duration-200"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg ${item.shadow}`}>
                                <Icon size={26} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-[16px] text-gray-900 dark:text-white">{item.label}</h3>
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                            </div>
                            <ChevronRight size={20} className="text-gray-300" />
                        </div>
                    );
                })}

                {/* Tips Card */}
                <div className="bg-gradient-to-br from-[#5B7FFF]/10 to-[#5B7FFF]/5 dark:from-[#5B7FFF]/20 dark:to-[#5B7FFF]/10 rounded-2xl p-4 border border-[#5B7FFF]/20">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5B7FFF] flex items-center justify-center shadow-lg shadow-[#5B7FFF]/25">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-[14px] text-gray-900 dark:text-white">💡 小贴士</h4>
                            <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                世界书可以根据对话内容自动注入设定，让 AI 记住更多背景信息！
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscoverTab;
