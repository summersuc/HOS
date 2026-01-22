import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { llmService } from '../../../services/LLMService';
import { Image as ImageIcon, RotateCcw, MessageCircle, Sparkles, User, Trash2 } from 'lucide-react';

const ChatSettingsPage = ({ conversationId, characterId, onBack, onProfile }) => {
    // Local State
    const [historyStr, setHistoryStr] = useState('20');
    const [replyMinStr, setReplyMinStr] = useState('2');
    const [replyMaxStr, setReplyMaxStr] = useState('8');
    const [noPunctuation, setNoPunctuation] = useState(false);
    const [avatarMode, setAvatarMode] = useState('none'); // none, ai_only, both, smart
    const [tokens, setTokens] = useState(0);

    // Safe ID for database
    const safeId = parseInt(conversationId) || conversationId;

    // Live Data
    const conversation = useLiveQuery(() => {
        if (!safeId) return undefined;
        return db.conversations.get(safeId);
    }, [safeId]);

    // Sync local state with conversation data
    useEffect(() => {
        if (conversation) {
            if (conversation.historyLimit !== undefined) {
                setHistoryStr(conversation.historyLimit === 0 ? '' : String(conversation.historyLimit));
            }
            if (conversation.replyCount) {
                const str = String(conversation.replyCount);
                if (str.includes('-')) {
                    const [min, max] = str.split('-');
                    setReplyMinStr(min);
                    setReplyMaxStr(max);
                } else {
                    setReplyMinStr(str);
                    setReplyMaxStr(str);
                }
            }
            if (conversation.noPunctuation !== undefined) {
                setNoPunctuation(conversation.noPunctuation);
            }
            if (conversation.avatarMode) {
                setAvatarMode(conversation.avatarMode);
            }
        }
    }, [conversation]);

    // Live Token Preview
    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                const h = parseInt(historyStr) || 0;
                const r = `${replyMinStr || 1}-${replyMaxStr || 1}`;
                const context = await llmService.buildContext(characterId, conversationId, '', {
                    historyLimit: h,
                    replyCount: r,
                    noPunctuation
                });
                const fullText = context.map(m => m.content).join('\n');
                const count = llmService.estimateTokens(fullText);
                setTokens(count);
            } catch (e) {
                console.error('Token estimation failed', e);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [historyStr, replyMinStr, replyMaxStr, noPunctuation, characterId, conversationId]);

    // Handlers
    const handleWallpaperUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const blobUrl = ev.target.result;
                if (safeId) {
                    await db.conversations.update(safeId, { wallpaper: blobUrl });
                    triggerHaptic();
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleWallpaperUrl = async (url) => {
        if (safeId) {
            await db.conversations.update(safeId, { wallpaper: url });
        }
    };

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
            noPunctuation,
            avatarMode
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
                        <div className="absolute top-0 right-0 w-20 h-20 bg-[#5B7FFF]/10 rounded-full blur-xl" />
                        <div className="relative flex justify-between items-center mb-3">
                            <span className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-[#5B7FFF]" />
                                预计消耗
                            </span>
                            <span className={`text-lg font-bold font-mono ${tokens > 50000 ? 'text-red-500' : 'text-[#5B7FFF]'}`}>
                                {tokens.toLocaleString()} <span className="text-xs font-normal opacity-60">Tokens</span>
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-black/40 h-2 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((tokens / 50000) * 100, 100)}%` }}
                                className={`h-full rounded-full ${tokens > 50000 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-[#5B7FFF] to-[#A78BFA]'}`}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 text-right">上限: 50,000</p>
                    </div>

                    {/* Section: Visual Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pl-1">
                            <div className="h-4 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600" />
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
                                    {conversation?.wallpaper ? (
                                        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url(${conversation.wallpaper})` }} />
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
                                        defaultValue={conversation?.wallpaper?.startsWith('http') ? conversation.wallpaper : ''}
                                        onBlur={(e) => handleWallpaperUrl(e.target.value)}
                                    />
                                    {conversation?.wallpaper && (
                                        <button onClick={() => handleWallpaperUrl('')} className="text-[10px] text-red-500 text-right">
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
                            <div className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-purple-600" />
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
                                <span className="text-sm font-bold text-[#5B7FFF]">{history === 0 ? '∞' : history}</span>
                            </div>

                            <div className="flex gap-2">
                                {[20, 50, 100, 0].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setHistoryStr(val === 0 ? '' : String(val))}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${history === val
                                            ? 'bg-[#5B7FFF] text-white shadow-md'
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
                                    className="w-20 text-right bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none border-b border-transparent focus:border-[#5B7FFF] transition-colors"
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

                    {/* Section: Other Actions */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pl-1">
                            <div className="h-4 w-1 rounded-full bg-gradient-to-b from-orange-400 to-red-500" />
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
                        className="w-full py-4 bg-gradient-to-r from-[#5B7FFF] to-[#7C3AED] active:opacity-90 transition-all text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30"
                    >
                        保存配置
                    </motion.button>
                </div>
            </div>
        </IOSPage>
    );
};

export default ChatSettingsPage;
