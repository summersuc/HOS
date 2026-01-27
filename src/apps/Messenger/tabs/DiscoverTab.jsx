import React from 'react';
import { Book, Sliders } from 'lucide-react';
import { ChevronRight, Sparkles } from '../icons';
import { triggerHaptic } from '../../../utils/haptics';
import { motion } from 'framer-motion';

const DiscoverTab = ({ onOpenWorldBook }) => {
    const items = [
        {
            id: 'worldbook',
            icon: Book,
            label: '世界书',
            desc: '管理触发词条和背景设定',
            gradient: 'from-gray-400 to-gray-500',
            shadow: 'shadow-gray-400/20',
            action: onOpenWorldBook
        },
    ];

    return (
        <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-black">
            {/* Header - V3 Soft Gradient Blur */}
            <div className="shrink-0 relative z-30">
                <div
                    className="absolute top-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-b from-[#F2F2F7]/95 to-transparent dark:from-black/90 dark:to-transparent backdrop-blur-xl"
                    style={{
                        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                    }}
                />
                <div className="relative pt-[var(--sat)] h-[calc(56px+var(--sat))] flex items-center px-5">
                    <h1 className="text-[32px] font-bold text-gray-900 dark:text-gray-200 tracking-tight">发现</h1>
                </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map(item => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={item.id}
                            onClick={() => { triggerHaptic(); item.action(); }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl rounded-3xl p-5 flex items-center gap-4 shadow-md border border-gray-200/50 dark:border-white/8 cursor-pointer transition-all duration-200 hover:shadow-lg"
                        >
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-xl ${item.shadow} relative overflow-hidden`}>
                                {/* 光泽效果 */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                                <Icon size={28} className="text-white relative z-10" strokeWidth={2} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-[16px] text-gray-900 dark:text-white">{item.label}</h3>
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                            </div>
                            <ChevronRight size={20} className="text-gray-300" />
                        </motion.div>
                    );
                })}

                {/* Tips Card */}
                <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 backdrop-blur-xl rounded-3xl p-5 border border-blue-200/30 dark:border-blue-800/30 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
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
