import React, { useState, useEffect } from 'react';
import { Copy, Trash2, RotateCcw, Check } from 'lucide-react';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import IOSPage from '../../../components/AppWindow/IOSPage';

// Default CSS Templates
const DEFAULT_GLOBAL_CSS = `/* Messenger 全局美化 */
.messenger-chat-bg {
    background: linear-gradient(180deg, #F2F2F7 0%, #E5E5EA 100%);
}

.dark .messenger-chat-bg {
    background: linear-gradient(180deg, #0A0A0A 0%, #1C1C1E 100%);
}`;

const DEFAULT_BUBBLE_CSS = `/* 用户气泡 (右侧) */
.bubble-user-tail {
    background: linear-gradient(135deg, #5B7FFF 0%, #4A6CF7 100%);
    border-radius: 18px 18px 4px 18px;
}

/* AI 气泡 (左侧) */
.bubble-ai-tail {
    background: #FFFFFF;
    border-radius: 18px 18px 18px 4px;
}

.dark .bubble-ai-tail {
    background: #2C2C2E;
}

/* 转账卡片 */
.bubble-transfer {
    background: linear-gradient(135deg, #F79C1D 0%, #F5A623 100%);
    /* background-image: url(''); */
}

/* 红包卡片 */
.bubble-redpacket {
    background: linear-gradient(135deg, #EA5F39 0%, #E74C3C 100%);
    /* background-image: url(''); */
}

/* 图片气泡 */
.bubble-image {
    border-radius: 18px;
    overflow: hidden;
    /* background-image: url(''); */
}`;

const BeautifyEditor = ({ onBack }) => {
    const [globalCss, setGlobalCss] = useState('');
    const [bubbleCss, setBubbleCss] = useState('');
    const [copiedGlobal, setCopiedGlobal] = useState(false);
    const [copiedBubble, setCopiedBubble] = useState(false);

    // Load saved CSS on mount
    useEffect(() => {
        const loadSettings = async () => {
            const globalSetting = await db.settings.get('messenger_global_css');
            const bubbleSetting = await db.settings.get('messenger_bubble_css');
            if (globalSetting) setGlobalCss(globalSetting.value);
            if (bubbleSetting) setBubbleCss(bubbleSetting.value);
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        triggerHaptic();
        await db.settings.put({ key: 'messenger_global_css', value: globalCss });
        await db.settings.put({ key: 'messenger_bubble_css', value: bubbleCss });
        alert('美化已保存！返回聊天页即可生效。');
        onBack();
    };

    const handleResetAll = async () => {
        triggerHaptic();
        setGlobalCss('');
        setBubbleCss('');
        await db.settings.delete('messenger_global_css');
        await db.settings.delete('messenger_bubble_css');
        alert('已恢复默认主题！');
    };

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text);
        triggerHaptic();
        if (type === 'global') {
            setCopiedGlobal(true);
            setTimeout(() => setCopiedGlobal(false), 1500);
        } else {
            setCopiedBubble(true);
            setTimeout(() => setCopiedBubble(false), 1500);
        }
    };

    return (
        <IOSPage title="美化仓库" onBack={onBack}>
            <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-black">
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

                    {/* Section: Global CSS Input */}
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white">全局美化 CSS</h3>
                            <button
                                onClick={() => { triggerHaptic(); setGlobalCss(''); }}
                                className="text-red-500 text-[13px] flex items-center gap-1"
                            >
                                <Trash2 size={14} /> 清空
                            </button>
                        </div>
                        <textarea
                            value={globalCss}
                            onChange={(e) => setGlobalCss(e.target.value)}
                            placeholder="粘贴你的全局美化 CSS 代码..."
                            className="w-full h-32 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl p-3 text-[13px] font-mono text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-[#5B7FFF]/50"
                        />
                    </div>

                    {/* Section: Bubble CSS Input */}
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white">气泡美化 CSS</h3>
                            <button
                                onClick={() => { triggerHaptic(); setBubbleCss(''); }}
                                className="text-red-500 text-[13px] flex items-center gap-1"
                            >
                                <Trash2 size={14} /> 清空
                            </button>
                        </div>
                        <textarea
                            value={bubbleCss}
                            onChange={(e) => setBubbleCss(e.target.value)}
                            placeholder="粘贴你的气泡美化 CSS 代码..."
                            className="w-full h-32 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl p-3 text-[13px] font-mono text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-[#5B7FFF]/50"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            className="flex-1 py-4 bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-white font-bold rounded-2xl active:scale-95 transition-transform"
                        >
                            确定
                        </button>
                        <button
                            onClick={handleResetAll}
                            className="py-4 px-5 bg-gray-200 dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300 font-bold rounded-2xl active:scale-95 transition-transform flex items-center gap-2"
                        >
                            <RotateCcw size={18} /> 恢复默认
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                        <span className="text-[12px] text-gray-400 uppercase tracking-wider">默认模板</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    </div>

                    {/* Default Global CSS Template */}
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white">全局 CSS 模板</h3>
                            <button
                                onClick={() => handleCopy(DEFAULT_GLOBAL_CSS, 'global')}
                                className="text-[#5B7FFF] text-[13px] flex items-center gap-1"
                            >
                                {copiedGlobal ? <Check size={14} /> : <Copy size={14} />}
                                {copiedGlobal ? '已复制' : '复制'}
                            </button>
                        </div>
                        <pre className="bg-gray-50 dark:bg-[#2C2C2E] rounded-xl p-3 text-[11px] font-mono text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
                            {DEFAULT_GLOBAL_CSS}
                        </pre>
                    </div>

                    {/* Default Bubble CSS Template */}
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white">气泡 CSS 模板</h3>
                            <button
                                onClick={() => handleCopy(DEFAULT_BUBBLE_CSS, 'bubble')}
                                className="text-[#5B7FFF] text-[13px] flex items-center gap-1"
                            >
                                {copiedBubble ? <Check size={14} /> : <Copy size={14} />}
                                {copiedBubble ? '已复制' : '复制'}
                            </button>
                        </div>
                        <pre className="bg-gray-50 dark:bg-[#2C2C2E] rounded-xl p-3 text-[11px] font-mono text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
                            {DEFAULT_BUBBLE_CSS}
                        </pre>
                    </div>
                </div>
            </div>
        </IOSPage>
    );
};

export default BeautifyEditor;
