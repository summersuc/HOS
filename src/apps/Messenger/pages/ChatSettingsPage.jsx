import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { storageService } from '../../../services/StorageService';
import {
    Image as ImageIcon,
    History,
    MessageCircle,
    Sparkles,
    User,
    Trash2,
    ChevronDown,
    Palette,
    Bot,
    Puzzle,
    UserCheck,
    Check,
    Moon,
    Layout
} from 'lucide-react';

// --- Helper Components (Defined outside to prevent remounting) ---
const ItemHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="flex items-center gap-3 mb-2">
        <div className="w-6 h-6 flex items-center justify-center">
            <Icon size={22} className="text-gray-600 dark:text-gray-300" strokeWidth={2} />
        </div>
        <div className="flex flex-col">
            <span className="text-[15px] font-medium text-gray-900 dark:text-white">{title}</span>
            {subtitle && <span className="text-[10px] text-gray-400">{subtitle}</span>}
        </div>
    </div>
);

const Section = ({ id, label, icon: Icon, expandedSection, toggleSection, children }) => {
    const isOpen = expandedSection === id;
    return (
        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 transition-all">
            <button
                onClick={() => toggleSection(id)}
                className="w-full flex items-center gap-4 p-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
                <div className="w-6 h-6 flex items-center justify-center">
                    <Icon size={22} className="text-gray-600 dark:text-gray-300" strokeWidth={2} />
                </div>
                <span className="flex-1 text-left font-medium text-[16px] text-gray-900 dark:text-white">{label}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}>
                    <ChevronDown size={18} className="text-gray-300" />
                </motion.div>
            </button>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                    style={{ willChange: 'height, opacity' }}
                >
                    <div className="px-4 pb-4">
                        {children}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

const ChatSettingsPage = ({ conversationId, characterId, onBack, onProfile }) => {
    // --- State Management ---
    const [expandedSection, setExpandedSection] = useState('model');

    const toggleSection = (id) => {
        triggerHaptic();
        setExpandedSection(prev => prev === id ? null : id);
    };

    const [historyStr, setHistoryStr] = useState('20');
    const [replyMinStr, setReplyMinStr] = useState('2');
    const [replyMaxStr, setReplyMaxStr] = useState('8');
    const [maxTokensStr, setMaxTokensStr] = useState('5000');

    const [proactiveHoursStr, setProactiveHoursStr] = useState('0');
    const [proactiveEnabled, setProactiveEnabled] = useState(false); // New Toggle State

    // Persona State
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);
    const allPersonas = useLiveQuery(() => db.userPersonas.toArray()) || [];

    // DND State
    const [dndEnabled, setDndEnabled] = useState(true);
    const [dndStart, setDndStart] = useState('23:00');
    const [dndEnd, setDndEnd] = useState('08:00');

    const [noPunctuation, setNoPunctuation] = useState(false);
    const [avatarMode, setAvatarMode] = useState('none');
    const [headerStyle, setHeaderStyle] = useState('standard');
    const [translationMode, setTranslationMode] = useState({
        enabled: false,
        showOriginal: true,
        style: 'inside',
        interaction: 'direct'
    });
    const [tokens, setTokens] = useState(0);
    const [wallpaperPreview, setWallpaperPreview] = useState(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const safeId = parseInt(conversationId) || conversationId;

    // --- Data Sync ---
    const conversation = useLiveQuery(() => {
        if (!safeId) return undefined;
        return db.conversations.get(safeId);
    }, [safeId]);

    useEffect(() => {
        if (conversation && !isInitialized) {
            if (conversation.wallpaper) {
                if (conversation.wallpaper.startsWith('idb:')) {
                    const cached = storageService.getCachedBlobUrl(conversation.wallpaper);
                    setWallpaperPreview(cached || null);
                } else {
                    setWallpaperPreview(conversation.wallpaper);
                }
            }

            if (conversation.historyLimit !== undefined) setHistoryStr(String(conversation.historyLimit));
            if (conversation.replyCount) {
                const [min, max] = conversation.replyCount.split('-');
                if (min) setReplyMinStr(min);
                if (max) setReplyMaxStr(max);
            }
            if (conversation.maxTokens) setMaxTokensStr(String(conversation.maxTokens));
            if (conversation.noPunctuation !== undefined) setNoPunctuation(conversation.noPunctuation);

            // Proactive Logic
            if (conversation.proactiveWaitHours !== undefined) {
                setProactiveHoursStr(String(conversation.proactiveWaitHours));
                setProactiveEnabled(conversation.proactiveWaitHours > 0);
            }

            if (conversation.proactiveDndEnabled !== undefined) setDndEnabled(conversation.proactiveDndEnabled);
            if (conversation.proactiveDndStart) setDndStart(conversation.proactiveDndStart);
            if (conversation.proactiveDndEnd) setDndEnd(conversation.proactiveDndEnd);
            if (conversation.avatarMode) setAvatarMode(conversation.avatarMode);
            if (conversation.headerStyle) setHeaderStyle(conversation.headerStyle);
            if (conversation.translationMode) setTranslationMode({
                ...translationMode,
                ...conversation.translationMode
            });

            if (conversation.userPersonaId) setSelectedPersonaId(conversation.userPersonaId);
            else {
                // If not set on conversation, find the currently active one to show as default selected (visually)
                // But do we set it? If we leave it null, ChatDetail falls back to active.
                // Better to leave null unless explicitly set for this chat?
                // User wants to *switch* for *this* chat.
                // If I select one, it becomes bound.
                if (conversation.userPersonaId === undefined) {
                    // Check active
                    db.userPersonas.filter(p => p.isActive).first().then(p => {
                        if (p) setSelectedPersonaId(p.id);
                    });
                }
            }
            setIsInitialized(true);
        }
    }, [conversation, isInitialized]);

    // --- Token Calculation ---
    // Fetch all context data reactively
    const contextData = useLiveQuery(async () => {
        if (!safeId) return null;

        const convo = await db.conversations.get(safeId);
        if (!convo) return null;

        const char = await db.characters.get(convo.characterId);
        const persona = convo.userPersonaId ? await db.userPersonas.get(convo.userPersonaId) : null;

        // World Book: Global OR bound to this character
        const wbEntries = await db.worldBookEntries
            .filter(w => w.enabled && (w.isGlobal || w.characterId === convo.characterId))
            .toArray();

        const msgs = await db.messengerMessages
            .where('[conversationType+conversationId]')
            .equals(['single', safeId])
            .toArray();

        return { char, persona, wbEntries, msgs };
    }, [safeId]);

    useEffect(() => {
        if (contextData) {
            const { char, persona, wbEntries, msgs } = contextData;
            let totalChars = 0;

            // 1. Character Context
            if (char) {
                totalChars += (char.name?.length || 0);
                totalChars += (char.description?.length || 0);
                totalChars += (char.personality?.length || 0);
                // Schema check: schema says 'scenario', 'exampleDialogue' might be in description or separate?
                // V4 schema has them.
                totalChars += (char.scenario?.length || 0);
                totalChars += (char.exampleDialogue?.length || 0);
                totalChars += (char.firstMessage?.length || 0);
            }

            // 2. User Persona
            if (persona) {
                totalChars += (persona.name?.length || 0);
                totalChars += (persona.description?.length || 0);
            }

            // 3. World Book
            if (wbEntries) {
                wbEntries.forEach(w => {
                    // Title + Keywords + Content
                    totalChars += (w.title?.length || 0);
                    totalChars += (w.keywords?.length || 0);
                    // Content field check: V4 schema says 'content' is extra field? 
                    // Wait, V4 schema comment says "Extra fields: content". 
                    // But stores defines 'worldBookEntries' with 'title, keywords...'. 
                    // Dexie allows extra props.
                    totalChars += (w.content?.length || 0);
                });
            }

            // 4. Message History
            if (msgs) {
                msgs.forEach(m => {
                    if (m.content) totalChars += m.content.length;
                    // Metadata overhead? minimal.
                });
            }

            // 5. System Overhead (Rules, Time, etc)
            // Still need a base buffer for JSON structure and system instructions
            const baseSystemPrompt = 500;

            // Calculation: Char * 1.3 (Slightly higher for JSON overhead) + Base
            setTokens(Math.ceil(totalChars * 1.3) + baseSystemPrompt);
        }
    }, [contextData]);

    // --- Actions ---
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
            maxTokens: !isNaN(parseInt(maxTokensStr)) ? parseInt(maxTokensStr) : 5000,
            userPersonaId: selectedPersonaId, // Save Bound Persona
            proactiveWaitHours: proactiveEnabled ? (parseFloat(proactiveHoursStr) || 0) : 0, // Logic update
            proactiveDndEnabled: dndEnabled,
            proactiveDndStart: dndStart,
            proactiveDndEnd: dndEnd,
            noPunctuation,
            avatarMode,
            headerStyle,
            translationMode
        });
        triggerHaptic();
        onBack();
    };

    const handleWallpaperUpload = async (e) => {
        const file = e.target.files[0];
        if (file && safeId) {
            const objectUrl = URL.createObjectURL(file);
            setWallpaperPreview(objectUrl);
            try {
                await storageService.saveBlob('chatWallpapers', safeId, file, 'data');
                const ref = storageService.getReference('chatWallpapers', safeId);
                await db.conversations.update(safeId, { wallpaper: ref });
                triggerHaptic();
            } catch (err) {
                alert('背景上传失败');
            }
        }
    };

    const handleWallpaperUrl = async (url) => {
        if (safeId && url) {
            setWallpaperPreview(url);
            await db.conversations.update(safeId, { wallpaper: url });
        }
    };

    const clearWallpaper = async () => {
        if (safeId) {
            setWallpaperPreview(null);
            await db.conversations.update(safeId, { wallpaper: null });
        }
    };

    const handleClearHistory = async () => {
        if (confirm('确定清空所有聊天记录？')) {
            await db.messengerMessages.where('[conversationType+conversationId]').equals(['single', safeId]).delete();
            triggerHaptic();
            onBack();
        }
    };

    const history = parseInt(historyStr) || 0;

    // --- Content Renderers ---

    const renderModelSettings = () => (
        <div className="space-y-4 pt-1 pb-4">
            {/* Persona Switcher */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-3">
                <ItemHeader icon={UserCheck} title="我的设定 (Persona)" subtitle="指定本对话使用的用户人设" />
                <div className="grid grid-cols-2 gap-2">
                    {allPersonas.map(p => {
                        let avatarSrc = p.avatar;
                        if (typeof p.avatar === 'string' && p.avatar.startsWith('idb:')) {
                            avatarSrc = storageService.getCachedBlobUrl(p.avatar) || p.avatar;
                        } else if (p.avatar instanceof Blob) {
                            avatarSrc = URL.createObjectURL(p.avatar);
                        }

                        const displayName = p.userName || p.name || '未命名';

                        return (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPersonaId(p.id)}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${selectedPersonaId === p.id
                                    ? 'bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-900/20 dark:border-pink-500/30 dark:text-pink-300 ring-1 ring-pink-500/20'
                                    : 'bg-white dark:bg-gray-700 border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                            >
                                <img src={avatarSrc} className="w-8 h-8 rounded-full object-cover bg-gray-200" alt={displayName} />
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-xs font-bold truncate max-w-[80px]">{displayName}</span>
                                    {p.isActive && selectedPersonaId !== p.id && <span className="text-[9px] text-gray-400">全局当前</span>}
                                </div>
                                {selectedPersonaId === p.id && <div className="ml-auto w-2 h-2 rounded-full bg-pink-500" />}
                            </button>
                        );
                    })}
                    {allPersonas.length === 0 && <div className="col-span-2 text-xs text-gray-400 text-center py-2">暂无人设，请去[我]页面添加</div>}
                </div>
            </div>

            {/* History Limit */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-3">
                <ItemHeader icon={History} title="记忆深度" subtitle="读取的消息条数" />
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-gray-500">当前设定</span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{history === 0 ? '全量记忆 (∞)' : `${history} 条`}</span>
                </div>
                <div className="flex gap-2">
                    {[20, 50, 100, 0].map(val => (
                        <button key={val} onClick={() => setHistoryStr(val === 0 ? '' : String(val))} className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${history === val ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-white/5'}`}>
                            {val === 0 ? '全量' : val}
                        </button>
                    ))}
                </div>
                {/* Custom Input */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-white/5 mt-1">
                    <span className="text-[10px] text-gray-400 pl-1">自定义条数</span>
                    <input
                        type="number"
                        value={historyStr}
                        onChange={(e) => setHistoryStr(e.target.value)}
                        className="flex-1 text-right bg-transparent text-xs font-bold text-gray-900 dark:text-white outline-none placeholder-gray-300"
                        placeholder="输入数量"
                    />
                </div>
            </div>
            {/* Reply Length */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-3">
                <ItemHeader icon={MessageCircle} title="回复长度范围" subtitle="控制每次回复的句数" />
                <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white dark:bg-gray-700/50 rounded-lg p-2 flex flex-col items-center">
                        <span className="text-[9px] text-gray-400 uppercase tracking-widest">Min</span>
                        <input type="number" value={replyMinStr} onChange={e => setReplyMinStr(e.target.value)} className="w-full text-center bg-transparent text-sm font-bold outline-none dark:text-white" />
                    </div>
                    <span className="text-gray-300">-</span>
                    <div className="flex-1 bg-white dark:bg-gray-700/50 rounded-lg p-2 flex flex-col items-center">
                        <span className="text-[9px] text-gray-400 uppercase tracking-widest">Max</span>
                        <input type="number" value={replyMaxStr} onChange={e => setReplyMaxStr(e.target.value)} className="w-full text-center bg-transparent text-sm font-bold outline-none dark:text-white" />
                    </div>
                </div>
            </div>
            {/* Max Tokens */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-2">
                <ItemHeader icon={Puzzle} title="输出上限 (Tokens)" subtitle="强制截断过长的回复" />
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-gray-400">当前值</span>
                    <span className="text-xs font-bold text-green-500">{parseInt(maxTokensStr) || 0}</span>
                </div>
                <input type="range" min="0" max="5000" step="100" value={!isNaN(parseInt(maxTokensStr)) ? parseInt(maxTokensStr) : 5000} onChange={e => setMaxTokensStr(e.target.value)} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                <div className="flex justify-between text-[9px] text-gray-400 px-1">
                    <span>0 (无上限)</span>
                    <span>5000</span>
                </div>
            </div>
            {/* No Punctuation */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">禁止标点</span>
                    <span className="text-[10px] text-gray-400">强制用空格分隔句子 (不使用标点符号)</span>
                </div>
                <button onClick={() => setNoPunctuation(!noPunctuation)} className={`w-10 h-6 rounded-full relative transition-colors ${noPunctuation ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${noPunctuation ? 'translate-x-4' : ''}`} />
                </button>
            </div>
        </div>
    );

    const renderVisualSettings = () => (
        <div className="space-y-4 pt-1 pb-4">
            {/* Wallpaper */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-3">
                <ItemHeader icon={ImageIcon} title="聊天背景" subtitle="自定义聊天窗口壁纸" />
                <div className="flex gap-2">
                    <label className="w-20 h-20 bg-white dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer border border-dashed border-gray-300 dark:border-white/10 overflow-hidden relative hover:bg-gray-50 transition-colors">
                        {wallpaperPreview && <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: `url(${wallpaperPreview})` }} />}
                        <div className="relative z-10 flex flex-col items-center">
                            <ImageIcon size={18} className="text-gray-400" />
                            <span className="text-[9px] text-gray-500 mt-1">点击上传</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleWallpaperUpload} />
                    </label>
                    <div className="flex-1 flex flex-col justify-center gap-2">
                        <input className="w-full bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-xs outline-none dark:text-white" placeholder="或输入图片 URL..." defaultValue={conversation?.wallpaper?.startsWith('http') ? conversation.wallpaper : ''} onBlur={(e) => handleWallpaperUrl(e.target.value)} />
                        {wallpaperPreview && <button onClick={clearWallpaper} className="text-[10px] text-red-500 text-left hover:underline pl-1">清除背景</button>}
                    </div>
                </div>
                <div className="flex items-center justify-between pt-1 px-1">
                    <span className="text-[11px] text-gray-500">启用背景遮罩 (磨砂效果)</span>
                    <button onClick={async () => { const current = conversation?.wallpaperMask !== false; if (safeId) { await db.conversations.update(safeId, { wallpaperMask: !current }); triggerHaptic(); } }} className={`w-8 h-4 rounded-full relative transition-colors ${conversation?.wallpaperMask !== false ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${conversation?.wallpaperMask !== false ? 'translate-x-4' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Header Style */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-3">
                <ItemHeader icon={Layout} title="顶栏样式" subtitle="不仅是名字，更是心情" />
                <div className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'name_only', l: '简约文本', d: '只显示名字' },
                        { id: 'standard', l: '标准模式', d: '头像 + 名字 (默认)' },
                        { id: 'immersive', l: '心动连线', d: 'AI头像 + 动态爱心 + 我的头像' }
                    ].map(m => (
                        <button key={m.id} onClick={() => { setHeaderStyle(m.id); triggerHaptic(); }} className={`flex items-center justify-between px-3 py-3 rounded-lg border transition-all ${headerStyle === m.id ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white dark:bg-gray-700 border-transparent text-gray-600 dark:text-gray-300'}`}>
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-bold">{m.l}</span>
                                <span className={`text-[10px] ${headerStyle === m.id ? 'text-blue-100' : 'text-gray-400'}`}>{m.d}</span>
                            </div>
                            {headerStyle === m.id && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                        </button>
                    ))}
                </div>
            </div>
            {/* Avatar */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-3">
                <ItemHeader icon={User} title="头像显示模式" subtitle="选择聊天气泡的头像布局" />
                <div className="grid grid-cols-2 gap-2">
                    {[{ id: 'none', l: '无头像', d: '极简' }, { id: 'ai_only', l: '仅对方', d: '沉浸' }, { id: 'both', l: '双头像', d: '经典' }, { id: 'smart', l: '智能组块', d: '连续' }].map(m => (
                        <button key={m.id} onClick={() => { setAvatarMode(m.id); triggerHaptic(); }} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${avatarMode === m.id ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white dark:bg-gray-700 border-transparent text-gray-600 dark:text-gray-300'}`}>
                            <span className="text-xs font-bold">{m.l}</span>
                            {avatarMode === m.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </button>
                    ))}
                </div>
            </div>
            {/* Bilingual */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">双语翻译</span>
                        <span className="text-[10px] text-gray-400">回复时附带翻译</span>
                    </div>
                    <button onClick={() => { setTranslationMode(p => ({ ...p, enabled: !p.enabled })); triggerHaptic(); }} className={`w-10 h-6 rounded-full relative transition-colors ${translationMode.enabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${translationMode.enabled ? 'translate-x-4' : ''}`} />
                    </button>
                </div>
                {translationMode.enabled && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-1 border-t border-gray-200 dark:border-white/5">
                        <div className="flex flex-col gap-2 pt-2">
                            <span className="text-[10px] font-medium text-gray-500">显示样式</span>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'merged', label: '合并显示', desc: '同气泡' },
                                    { id: 'split', label: '分体显示', desc: '双气泡' }
                                ].map(opt => (
                                    <button key={opt.id} onClick={() => { setTranslationMode(prev => ({ ...prev, style: opt.id })); triggerHaptic(); }}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${translationMode.style === opt.id
                                            ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-900/20 dark:border-orange-500/30 dark:text-orange-400'
                                            : 'bg-white dark:bg-gray-700 border-transparent text-gray-600 dark:text-gray-400'}`}>
                                        <span className="text-[10px] font-bold">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-medium text-gray-500">显示时机</span>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'always', label: '常驻显示', desc: '始终可见' },
                                    { id: 'click', label: '点击显示', desc: '点击展开' }
                                ].map(opt => (
                                    <button key={opt.id} onClick={() => { setTranslationMode(prev => ({ ...prev, interaction: opt.id })); triggerHaptic(); }}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${translationMode.interaction === opt.id
                                            ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-900/20 dark:border-orange-500/30 dark:text-orange-400'
                                            : 'bg-white dark:bg-gray-700 border-transparent text-gray-600 dark:text-gray-400'}`}>
                                        <span className="text-[10px] font-bold">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );

    const renderIntelligenceSettings = () => (
        <div className="space-y-4 pt-1 pb-4">
            {/* Proactive */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-3">
                <div className="flex justify-between items-center">
                    <ItemHeader icon={Sparkles} title="主动关怀" subtitle="若久未回复，将主动发消息" />
                    <button onClick={() => setProactiveEnabled(!proactiveEnabled)} className={`w-10 h-6 rounded-full relative transition-colors ${proactiveEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${proactiveEnabled ? 'translate-x-4' : ''}`} />
                    </button>
                </div>
                {proactiveEnabled && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">触发阈值:</span>
                            <input
                                type="number"
                                step="0.01"
                                value={proactiveHoursStr}
                                onChange={e => setProactiveHoursStr(e.target.value)}
                                className="flex-1 min-w-0 bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none"
                                placeholder="如 0.5"
                            />
                            <span className="text-xs text-gray-400">小时</span>
                        </div>
                        {parseFloat(proactiveHoursStr) > 0 && parseFloat(proactiveHoursStr) < 1 && (
                            <div className="text-[10px] text-indigo-500 font-medium text-right bg-indigo-50 dark:bg-indigo-900/10 rounded px-2 py-0.5 inline-block w-full">
                                ≈ {Math.round(parseFloat(proactiveHoursStr) * 60)} 分钟后触发
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
            {/* DND */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-3">
                <div className="flex justify-between items-center">
                    <ItemHeader icon={Moon} title="免打扰时段" subtitle="设定时间段内保持静默" />
                    <button onClick={() => setDndEnabled(!dndEnabled)} className={`w-10 h-6 rounded-full relative transition-colors ${dndEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${dndEnabled ? 'translate-x-4' : ''}`} />
                    </button>
                </div>
                {dndEnabled && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2 items-center">
                        <div className="flex-1 bg-white dark:bg-gray-700 rounded-lg p-2 flex flex-col items-center">
                            <span className="text-[9px] text-gray-400 mb-1">开始</span>
                            <input type="time" value={dndStart} onChange={e => setDndStart(e.target.value)} className="bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none text-center w-full" />
                        </div>
                        <span className="text-gray-300">-</span>
                        <div className="flex-1 bg-white dark:bg-gray-700 rounded-lg p-2 flex flex-col items-center">
                            <span className="text-[9px] text-gray-400 mb-1">结束</span>
                            <input type="time" value={dndEnd} onChange={e => setDndEnd(e.target.value)} className="bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none text-center w-full" />
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );

    const saveButton = (
        <button
            onClick={handleSave}
            className="text-[17px] font-bold text-gray-500 active:opacity-50 transition-opacity"
        >
            保存
        </button>
    );

    return (
        <IOSPage title="聊天设置" onBack={onBack} rightButton={saveButton}>
            <div className="min-h-full bg-gradient-to-br from-[#FAFAFA] to-[#F0F0F5] dark:from-[#1C1C1E] dark:to-[#0D0D0F] pb-[var(--sab)]">
                <div className="p-5 space-y-6">
                    {/* Token Counter */}
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">资源消耗</span>
                        <span className="text-xs font-mono text-gray-400">{tokens.toLocaleString()} Tokens</span>
                    </div>

                    {/* Accordion Groups */}
                    <AnimatePresence initial={false}>
                        <div className="space-y-4">
                            <Section id="model" label="模型与逻辑" icon={Bot} expandedSection={expandedSection} toggleSection={toggleSection}>
                                {renderModelSettings()}
                            </Section>

                            <Section id="visual" label="视觉与显示" icon={Palette} expandedSection={expandedSection} toggleSection={toggleSection}>
                                {renderVisualSettings()}
                            </Section>

                            <Section id="intelligence" label="智能响应" icon={Sparkles} expandedSection={expandedSection} toggleSection={toggleSection}>
                                {renderIntelligenceSettings()}
                            </Section>
                        </div>
                    </AnimatePresence>

                    {/* Actions */}
                    <div className="space-y-3 pt-4">
                        <button onClick={() => onProfile(characterId)} className="w-full bg-white dark:bg-[#2C2C2E] py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-all">查看角色资料</button>
                        <button onClick={handleClearHistory} className="w-full bg-white dark:bg-[#2C2C2E] py-3 rounded-xl text-sm font-medium text-red-500 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-all">清空记录</button>
                    </div>
                </div>
            </div>
        </IOSPage>
    );
};

export default ChatSettingsPage;
