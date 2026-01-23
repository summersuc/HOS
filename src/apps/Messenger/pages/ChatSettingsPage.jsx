import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { llmService } from '../../../services/LLMService';
import { Image as ImageIcon, RotateCcw, MessageCircle, Sparkles, User, Trash2 } from 'lucide-react';

import { storageService } from '../../../services/StorageService';

const ChatSettingsPage = ({ conversationId, characterId, onBack, onProfile }) => {
    // Local State
    const [historyStr, setHistoryStr] = useState('20');
    const [replyMinStr, setReplyMinStr] = useState('2');
    const [replyMaxStr, setReplyMaxStr] = useState('8');
    const [maxTokensStr, setMaxTokensStr] = useState('500');
    const [noPunctuation, setNoPunctuation] = useState(false);
    const [avatarMode, setAvatarMode] = useState('none'); // none, ai_only, both, smart
    const [translationMode, setTranslationMode] = useState({
        enabled: false,
        showOriginal: true,
        style: 'inside', // inside, outside
        interaction: 'direct' // direct, click
    });
    const [tokens, setTokens] = useState(0);

    // Safe ID for database
    const safeId = parseInt(conversationId) || conversationId;

    // Live Data
    const conversation = useLiveQuery(() => {
        if (!safeId) return undefined;
        return db.conversations.get(safeId);
    }, [safeId]);

    // Local Wallpaper Preview (Optimistic UI)
    const [wallpaperPreview, setWallpaperPreview] = useState(null);

    // Initial Sync for Wallpaper & Settings
    useEffect(() => {
        if (conversation) {
            // Wallpaper
            if (conversation.wallpaper) {
                if (conversation.wallpaper.startsWith('idb:')) {
                    const cached = storageService.getCachedBlobUrl(conversation.wallpaper);
                    setWallpaperPreview(cached || null);
                } else {
                    setWallpaperPreview(conversation.wallpaper);
                }
            }

            // Sync Settings
            if (conversation.historyLimit !== undefined) setHistoryStr(String(conversation.historyLimit));
            if (conversation.replyCount) {
                const [min, max] = conversation.replyCount.split('-');
                if (min) setReplyMinStr(min);
                if (max) setReplyMaxStr(max);
            }
            if (conversation.maxTokens) setMaxTokensStr(String(conversation.maxTokens));
            if (conversation.noPunctuation !== undefined) setNoPunctuation(conversation.noPunctuation);
            if (conversation.noPunctuation !== undefined) setNoPunctuation(conversation.noPunctuation);
            if (conversation.avatarMode) setAvatarMode(conversation.avatarMode);
            if (conversation.translationMode) setTranslationMode({
                ...translationMode,
                ...conversation.translationMode
            });
        }
    }, [conversation]);

    // Handlers
    const handleWallpaperUpload = async (e) => {
        const file = e.target.files[0];
        if (file && safeId) {
            // Optimistic UI
            const objectUrl = URL.createObjectURL(file);
            setWallpaperPreview(objectUrl);

            try {
                await storageService.saveBlob('chatWallpapers', safeId, file, 'data');
                const ref = storageService.getReference('chatWallpapers', safeId);
                await db.conversations.update(safeId, { wallpaper: ref });
                triggerHaptic();
            } catch (err) {
                console.error('Wallpaper upload failed', err);
                alert('背景上传失败');
            }
        }
    };

    const handleWallpaperUrl = async (url) => {
        if (safeId && url) { // Only update if URL is not empty
            setWallpaperPreview(url);
            await db.conversations.update(safeId, { wallpaper: url });
        }
    };

    const clearWallpaper = async () => {
        if (safeId) {
            setWallpaperPreview(null);
            await db.conversations.update(safeId, { wallpaper: null });
        }
    }

    const handleSave = async () => {
        const h = parseInt(historyStr) || 0;
        const min = parseInt(replyMinStr) || 1;
        const max = parseInt(replyMaxStr) || 1;

        if (min > max) {
            alert('回复长度最小值不能大于最大值');
            return;
        }

        await db.conversations.update(safeId, {
            historyLimit: h,
            replyCount: `${min}-${max}`,
            maxTokens: parseInt(maxTokensStr) || 500,
            noPunctuation,
            noPunctuation,
            avatarMode,
            translationMode
        });
        triggerHaptic();
        onBack();
    };

    const handleClearHistory = async () => {
        if (confirm('确定清空所有聊天记录？')) {
            await db.messengerMessages.where('[conversationType+conversationId]').equals(['single', safeId]).delete();
            triggerHaptic();
            onBack();
        }
    };

    const history = parseInt(historyStr) || 0;

    return (
        <IOSPage title="聊天设置" onBack={onBack}>
            <div className="flex flex-col h-full bg-gradient-to-br from-[#FAFAFA] to-[#F0F0F5] dark:from-[#1C1C1E] dark:to-[#0D0D0F]">
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Token Counter - Premium Card */}
                    <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-[#2C2C2E] dark:to-[#1A1A1C] rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-white/5 overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gray-400/10 rounded-full blur-xl" />
                        <div className="relative flex justify-between items-center mb-3">
                            <span className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-gray-500" />
                                预计消耗
                            </span>
                            <span className={`text-lg font-bold font-mono ${tokens > 50000 ? 'text-red-500' : 'text-gray-600'}`}>
                                {tokens.toLocaleString()} <span className="text-xs font-normal opacity-60">Tokens</span>
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-black/40 h-2 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((tokens / 50000) * 100, 100)}%` }}
                                className={`h-full rounded-full ${tokens > 50000 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 text-right">上限: 50,000</p>
                    </div>

                    {/* Section: Visual Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pl-1">
                            <div className="h-4 w-1 rounded-full bg-gradient-to-b from-gray-400 to-gray-500" />
                            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">视觉设置</h3>
                        </div>

                        {/* Wallpaper Setting */}
                        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                    <ImageIcon size={16} />
                                </div>
                                <span className="text-[15px] font-medium text-gray-900 dark:text-white">聊天背景</span>
                            </div>

                            <div className="flex gap-3">
                                {/* Local File */}
                                <label className="flex-1 h-20 bg-gray-50 dark:bg-black/30 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer border border-dashed border-gray-300 dark:border-white/10 hover:bg-gray-100 transition-colors relative overflow-hidden">
                                    {wallpaperPreview ? (
                                        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url(${wallpaperPreview})` }} />
                                    ) : null}
                                    <div className="relative z-10 flex flex-col items-center">
                                        <ImageIcon size={18} className="text-gray-400" />
                                        <span className="text-[10px] text-gray-500">上传图片</span>
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleWallpaperUpload} />
                                </label>

                                {/* URL Input */}
                                <div className="flex-1 flex flex-col gap-2">
                                    <input
                                        className="w-full bg-gray-50 dark:bg-black/30 rounded-xl px-3 py-2 text-xs dark:text-white outline-none"
                                        placeholder="或输入图片 URL..."
                                        // Use key to force re-render if needed, but here defaultValue is enough if component mounts fresh. 
                                        // However, if we want input to reflect manual deletes, we might need controlled component?
                                        // User said "clicking input clears upload", we fixed handleWallpaperUrl behavior.
                                        // Let's keep it simple.
                                        defaultValue={conversation?.wallpaper?.startsWith('http') ? conversation.wallpaper : ''}
                                        onBlur={(e) => handleWallpaperUrl(e.target.value)}
                                    />
                                    {wallpaperPreview && (
                                        <button onClick={clearWallpaper} className="text-[10px] text-red-500 text-right">
                                            清除背景
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Overlay Toggle */}
                            <div className="flex items-center justify-between pt-1 px-1">
                                <span className="text-[12px] text-gray-500">背景遮罩 (提升文字可读性)</span>
                                <button
                                    onClick={async () => {
                                        const current = conversation?.wallpaperMask !== false;
                                        if (safeId) {
                                            await db.conversations.update(safeId, { wallpaperMask: !current });
                                            triggerHaptic();
                                        }
                                    }}
                                    className={`w-9 h-5 rounded-full relative transition-colors ${conversation?.wallpaperMask !== false ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${conversation?.wallpaperMask !== false ? 'translate-x-4' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Avatar Mode Setting */}
                        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                    <User size={16} />
                                </div>
                                <span className="text-[15px] font-medium text-gray-900 dark:text-white">头像显示模式</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'none', label: '无头像', desc: '极致简约' },
                                    { id: 'ai_only', label: '仅对方', desc: '侧重互动' },
                                    { id: 'both', label: '双头像', desc: '经典对等' },
                                    { id: 'smart', label: '智能组块', desc: '清爽有序' }
                                ].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => { setAvatarMode(mode.id); triggerHaptic(); }}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${avatarMode === mode.id
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                                            : 'border-transparent bg-gray-50 dark:bg-black/20 hover:bg-gray-100'
                                            }`}
                                    >
                                        <span className={`text-sm font-bold ${avatarMode === mode.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {mode.label}
                                        </span>
                                        <span className="text-[10px] opacity-50">{mode.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Section: Logic Control */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pl-1">
                            <div className="h-4 w-1 rounded-full bg-gradient-to-b from-gray-400 to-gray-500" />
                            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">逻辑控制</h3>
                        </div>

                        {/* History Limit */}
                        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                        <RotateCcw size={16} />
                                    </div>
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-white">记忆深度</span>
                                </div>
                                <span className="text-sm font-bold text-gray-600">{history === 0 ? '∞' : history}</span>
                            </div>

                            <div className="flex gap-2">
                                {[20, 50, 100, 0].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setHistoryStr(val === 0 ? '' : String(val))}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${history === val
                                            ? 'bg-gray-600 text-white shadow-md'
                                            : 'bg-gray-100 dark:bg-black/30 text-gray-600 dark:text-gray-400'}`}
                                    >
                                        {val === 0 ? '全量' : val}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <span className="text-sm text-gray-500 pl-1">自定义条数</span>
                                <input
                                    type="number"
                                    value={historyStr}
                                    onChange={(e) => setHistoryStr(e.target.value)}
                                    placeholder="∞"
                                    className="w-20 text-right bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none border-b border-transparent focus:border-gray-400 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Reply Length */}
                        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                                    <MessageCircle size={16} />
                                </div>
                                <span className="text-[15px] font-medium text-gray-900 dark:text-white">回复长度范围</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-50 dark:bg-black/30 rounded-xl p-2 flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 uppercase">Min</span>
                                    <input
                                        type="number"
                                        value={replyMinStr}
                                        onChange={e => setReplyMinStr(e.target.value)}
                                        className="w-full text-center bg-transparent font-bold text-gray-900 dark:text-white outline-none"
                                    />
                                </div>
                                <span className="text-gray-300">-</span>
                                <div className="flex-1 bg-gray-50 dark:bg-black/30 rounded-xl p-2 flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 uppercase">Max</span>
                                    <input
                                        type="number"
                                        value={replyMaxStr}
                                        onChange={e => setReplyMaxStr(e.target.value)}
                                        className="w-full text-center bg-transparent font-bold text-gray-900 dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Max Tokens */}
                        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                                        <Sparkles size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">输出长度限制</span>
                                        <span className="text-[10px] text-gray-400">限制 AI 回复的总 Token 数</span>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-green-500">{parseInt(maxTokensStr) || 0}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="5000"
                                step="100"
                                value={parseInt(maxTokensStr) || 500}
                                onChange={e => setMaxTokensStr(e.target.value)}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>0 (无限制)</span>
                                <span>5000</span>
                            </div>
                        </div>

                        {/* No Punctuation Toggle */}
                        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-500">
                                    <Sparkles size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-white">禁止标点</span>
                                    <span className="text-[10px] text-gray-400">强制 AI 用空格分隔句子</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setNoPunctuation(!noPunctuation)}
                                className={`w-12 h-7 rounded-full transition-colors relative ${noPunctuation ? 'bg-pink-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                            >
                                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${noPunctuation ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Bilingual Settings */}
                    <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                                    <Sparkles size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-white">双语沟通</span>
                                    <span className="text-[10px] text-gray-400">AI 使用母语回复并附带翻译</span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setTranslationMode(prev => ({ ...prev, enabled: !prev.enabled }));
                                    triggerHaptic();
                                }}
                                className={`w-12 h-7 rounded-full transition-colors relative ${translationMode.enabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                            >
                                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${translationMode.enabled ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>

                        {translationMode.enabled && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="pt-2 space-y-3 border-t border-gray-100 dark:border-white/5"
                            >
                                {/* Translation Style */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-gray-500">显示位置</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'inside', label: '气泡内', desc: '合并显示' },
                                            { id: 'outside', label: '气泡外', desc: '独立显示' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setTranslationMode(prev => ({ ...prev, style: opt.id }))}
                                                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex flex-col items-center gap-0.5 ${translationMode.style === opt.id
                                                    ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-900/20 dark:border-orange-500/30 dark:text-orange-400'
                                                    : 'bg-gray-50 border-transparent text-gray-600 dark:bg-white/5 dark:text-gray-400'
                                                    }`}
                                            >
                                                <span>{opt.label}</span>
                                                <span className="text-[9px] opacity-60">{opt.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Interaction Mode */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-gray-500">显示方式</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'direct', label: '直接显示', desc: '始终可见' },
                                            { id: 'click', label: '点击显示', desc: '防剧透' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setTranslationMode(prev => ({ ...prev, interaction: opt.id }))}
                                                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex flex-col items-center gap-0.5 ${translationMode.interaction === opt.id
                                                    ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-900/20 dark:border-orange-500/30 dark:text-orange-400'
                                                    : 'bg-gray-50 border-transparent text-gray-600 dark:bg-white/5 dark:text-gray-400'
                                                    }`}
                                            >
                                                <span>{opt.label}</span>
                                                <span className="text-[9px] opacity-60">{opt.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>


                    {/* Section: Other Actions */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pl-1">
                            <div className="h-4 w-1 rounded-full bg-gradient-to-b from-gray-400 to-gray-500" />
                            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">其他操作</h3>
                        </div>
                        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                            <button onClick={() => { onProfile(characterId); }} className="w-full flex items-center gap-3 p-4 active:bg-gray-100 dark:active:bg-[#3A3A3C] text-left">
                                <User size={20} className="text-gray-900 dark:text-white" />
                                <span className="text-[16px] font-medium text-gray-900 dark:text-white">查看角色资料</span>
                            </button>
                            <div className="h-[1px] bg-gray-100 dark:bg-white/5 mx-4" />
                            <button onClick={handleClearHistory} className="w-full flex items-center gap-3 p-4 active:bg-gray-100 dark:active:bg-[#3A3A3C] text-left">
                                <Trash2 size={20} className="text-red-500" />
                                <span className="text-[16px] font-medium text-red-500">清空聊天记录</span>
                            </button>
                        </div>
                    </div>

                    <div className="h-6" />
                </div>

                {/* Save Button - Premium */}
                <div className="shrink-0 p-5 pb-[calc(var(--sab)+20px)] border-t border-gray-200/50 dark:border-white/5 bg-gradient-to-t from-[#FAFAFA] to-transparent dark:from-[#1C1C1E] dark:to-transparent">
                    <motion.button
                        onClick={handleSave}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-4 bg-gradient-to-r from-gray-400 to-gray-500 active:opacity-90 transition-all text-white font-bold rounded-2xl shadow-lg shadow-gray-400/30"
                    >
                        保存配置
                    </motion.button>
                </div>
            </div>
        </IOSPage >
    );
};

export default ChatSettingsPage;
