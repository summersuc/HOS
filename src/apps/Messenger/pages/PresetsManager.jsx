import React from 'react';
import { Sliders } from 'lucide-react';
import IOSPage from '../../../components/AppWindow/IOSPage';

const PresetsManager = ({ onBack }) => {
    return (
        <IOSPage title="Prompt 预设" onBack={onBack}>
            <div className="p-4 bg-[#F2F2F7] dark:bg-black min-h-full">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 text-center shadow-sm border border-gray-200/50 dark:border-white/5">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5B7FFF]/20 to-blue-100 dark:from-[#5B7FFF]/30 dark:to-blue-900/30 flex items-center justify-center mx-auto mb-5">
                        <Sliders size={36} className="text-[#5B7FFF]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">高级预设管理</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">
                        在此配置系统级 Prompt、越狱预设以及回复格式模板。<br />
                        (功能开发中)
                    </p>
                    <button className="px-6 py-2 bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 rounded-full text-sm font-medium">
                        敬请期待
                    </button>
                </div>
            </div>
        </IOSPage>
    );
};

export default PresetsManager;
