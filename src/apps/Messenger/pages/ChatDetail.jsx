import React, { useState, useEffect, useRef } from 'react';
import Avatar from '../components/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MoreVertical, RotateCcw, Copy, Trash2, User, PlusCircle, Mic, Image as ImageIcon, Smile, Gift, Wallet, MoreHorizontal, X, Edit2, Reply, ChevronRight, Settings, Sparkles, ArrowRightLeft, MessageCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import { storageService } from '../../../services/StorageService';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { llmService } from '../../../services/LLMService';
import NotificationService from '../../../services/NotificationService';
import { appRegistry } from '../../../config/appRegistry';

const ChatDetail = ({ conversationId, characterId, onBack, onProfile, onSettings }) => {
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedMsg, setSelectedMsg] = useState(null);
    const [showExtras, setShowExtras] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [replyTo, setReplyTo] = useState(null); // { id, content, name }

    // Type-safe ID for database operations
    const safeCid = React.useMemo(() => {
        if (conversationId === undefined || conversationId === null) return 0;
        if (typeof conversationId === 'number' && isNaN(conversationId)) return 0;
        if (typeof conversationId === 'string' && conversationId === 'NaN') return 0;

        const parsed = parseInt(conversationId);
        if (!isNaN(parsed)) return parsed;
        if (typeof conversationId === 'string') return conversationId;
        return 0;
    }, [conversationId]);

    // Modal State
    const [actionModal, setActionModal] = useState(null); // { type, label, icon... }

    // Settings State
    const [historyLimit, setHistoryLimit] = useState(20);
    const [replyCount, setReplyCount] = useState("2-8"); // Default 2-8 range
    const [noPunctuation, setNoPunctuation] = useState(false); // New state
    const [avatarMode, setAvatarMode] = useState('none');
    const [maxTokens, setMaxTokens] = useState(500); // Output length limit
    const [translationMode, setTranslationMode] = useState({ enabled: false, showOriginal: true, style: 'inside', interaction: 'direct' });
    const [estTokens, setEstTokens] = useState(0);

    // Custom CSS Injection
    const [customGlobalCss, setCustomGlobalCss] = useState('');
    const [customBubbleCss, setCustomBubbleCss] = useState('');

    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const character = useLiveQuery(() => db.characters.get(characterId), [characterId]);
    const conversation = useLiveQuery(() => db.conversations.get(safeCid), [safeCid]);

    // Force re-render when storage cache updates (for wallpaper changes)
    const [storageVersion, setStorageVersion] = useState(0);
    useEffect(() => {
        return storageService.subscribe(() => setStorageVersion(v => v + 1));
    }, []);

    // Unified Wallpaper Resolver - now reactive to storage updates
    const displayWallpaper = React.useMemo(() => {
        return conversation?.wallpaper?.startsWith('idb:')
            ? (storageService.getCachedBlobUrl(conversation.wallpaper) || conversation.wallpaper)
            : conversation?.wallpaper;
    }, [conversation?.wallpaper, storageVersion]);
    const messages = useLiveQuery(async () => {
        // Guard against invalid safeCid causing issues
        if ((!safeCid && safeCid !== 0) || (typeof safeCid === 'number' && isNaN(safeCid))) return [];
        try {
            const msgs = await db.messengerMessages.where('[conversationType+conversationId]').equals(['single', safeCid]).toArray();
            return msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        } catch (e) {
            console.error("Query messages failed", e);
            return [];
        }
    }, [safeCid]);

    const activePersona = useLiveQuery(async () => {
        try {
            // Use filter instead of where().equals(true) to avoid IDBKeyRange errors with booleans
            return await db.userPersonas.filter(p => p.isActive).first();
        } catch (e) { return null; }
    });

    const firstPersona = useLiveQuery(async () => {
        try {
            return await db.userPersonas.toCollection().first();
        } catch (e) { return null; }
    });

    const overridePersona = useLiveQuery(async () => {
        const uid = conversation?.userPersonaId;
        // Explicitly guard against NaN or invalid keys
        if (uid === undefined || uid === null) return null;
        if (typeof uid === 'number' && isNaN(uid)) return null;
        try {
            return await db.userPersonas.get(uid);
        } catch (e) {
            console.error("Fetch override persona failed", e);
            return null;
        }
    }, [conversation?.userPersonaId]);

    const userPersona = overridePersona || activePersona || firstPersona;

    const formatTimestamp = (ts) => {
        if (!ts) return '';
        const now = new Date();
        const date = new Date(ts);
        const isToday = now.toDateString() === date.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = yesterday.toDateString() === date.toDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        if (isToday) return timeStr;
        if (isYesterday) return `昨天 ${timeStr}`;
        return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
    };

    // Load Preferences
    useEffect(() => {
        if (conversation) {
            if (conversation.historyLimit !== undefined) setHistoryLimit(conversation.historyLimit);
            if (conversation.replyCount !== undefined) setReplyCount(conversation.replyCount);
            if (conversation.noPunctuation !== undefined) setNoPunctuation(conversation.noPunctuation);
            if (conversation.avatarMode) setAvatarMode(conversation.avatarMode);
            if (conversation.avatarMode) setAvatarMode(conversation.avatarMode);
            if (conversation.maxTokens !== undefined) setMaxTokens(conversation.maxTokens);
            if (conversation.translationMode) setTranslationMode({ ...translationMode, ...conversation.translationMode });
        }
    }, [conversation]);

    // Load Custom CSS
    useEffect(() => {
        const loadCustomCss = async () => {
            const globalSetting = await db.settings.get('messenger_global_css');
            const bubbleSetting = await db.settings.get('messenger_bubble_css');
            if (globalSetting) setCustomGlobalCss(globalSetting.value);
            if (bubbleSetting) setCustomBubbleCss(bubbleSetting.value);
        };
        loadCustomCss();
    }, []);

    // Live Token Estimation (Debounced)
    useEffect(() => {
        // Simple logic: Trigger check when menu is open or messages change
        if (showMenu) {
            const checkTokens = async () => {
                // Call buildContext with NO user text to see prompt size
                const context = await llmService.buildContext(characterId, conversationId, '', {
                    historyLimit,
                    replyCount,
                    noPunctuation
                });
                const fullText = context.map(m => m.content).join('\n');
                const count = llmService.estimateTokens(fullText);
                setEstTokens(count);
            };
            checkTokens();
        }
    }, [showMenu, messages?.length, historyLimit, replyCount, characterId, conversationId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages?.length, isTyping, showExtras]);

    // --- Core AI Logic (Refactored for Splitting) ---
    const runAI = async (userText) => {
        setIsTyping(true);
        // We buffer the FULL response here, then process it.
        // Or we could process stream chunk by chunk, but regex matching tags is safer on full/buffered text.
        // For "stream feel", we can detect delimiters in the buffer.

        // Let's use a "Buffer & Flush" strategy.
        let buffer = '';
        const pendingQueue = []; // Queue of { type: 'text'|'sticker', content: string }
        let processingQueue = false;

        const processQueue = async () => {
            if (processingQueue) return;
            processingQueue = true;

            while (pendingQueue.length > 0) {
                const item = pendingQueue.shift();

                // Add to DB
                await db.messengerMessages.add({
                    conversationType: 'single',
                    conversationId: safeCid,
                    role: 'assistant',
                    content: item.content,
                    msgType: item.type, // 'text' or 'sticker'
                    metadata: item.metadata || {}, // Ensure metadata is passed
                    timestamp: Date.now()
                });

                triggerHaptic();

                // Trigger Push Notification
                const userNotify = await db.notificationSettings.get('messenger');
                const userMode = await db.settings.get('mode_messenger');
                const notifyEnabled = userNotify ? userNotify.enabled : appRegistry.messenger.notificationEnabled;
                const transMode = userMode ? userMode.value : appRegistry.messenger.transmissionMode;

                if (notifyEnabled && transMode !== 'C') {
                    NotificationService.send(character?.name || '新消息', {
                        body: item.content,
                        silent: transMode === 'B',
                        tag: `messenger-${conversationId}`
                    });
                }

                // Artificial Delay for "Reading/Typing" feel (800ms)
                // PWA Optimization: If hidden, skip delay to fire notifications immediately
                if (document.visibilityState !== 'hidden') {
                    await new Promise(r => setTimeout(r, 800));
                }
            }

            processingQueue = false;
        };

        try {
            // 2. Build Context
            // Pass userPersona to Context
            const contextMessages = await llmService.buildContext(characterId, conversationId, userText, {
                historyLimit,
                replyCount,
                noPunctuation,
                replyCount,
                noPunctuation,
                translationMode,
                userPersona // Correctly pass the reactive userPersona object
            });

            // 3. Send Stream
            await llmService.sendMessageStream(
                contextMessages,
                (delta) => {
                    buffer += delta;

                    // Robust Regex to match ANY known command tag anywhere
                    // Captures: 1=Type, 2=Args
                    // Note: Translation is excluded from streaming regex to avoid partial tag issues
                    const CMD_REGEX = /\[(Sticker|RedPacket|Transfer|Gift|Image|图片)[:：]\s*(.*?)\]/i;

                    // Helper to process buffer recursively
                    const processBuffer = (finalFlush = false) => {
                        // Use extended regex on final flush to include Translation
                        const regex = finalFlush
                            ? /\[(Sticker|RedPacket|Transfer|Gift|Image|图片|Translation)[:：]\s*(.*?)\]/i
                            : CMD_REGEX;
                        const match = buffer.match(regex);
                        if (match) {
                            // 1. Text BEFORE command
                            if (match.index > 0) {
                                const textBefore = buffer.substring(0, match.index);
                                if (textBefore.trim()) {
                                    pendingQueue.push({ type: 'text', content: textBefore });
                                }
                            }

                            // 2. The Command
                            const typeStr = match[1].toLowerCase();
                            const argsStr = match[2].trim();

                            if (typeStr === 'sticker') {
                                pendingQueue.push({ type: 'sticker', content: argsStr, metadata: { stickerUrl: '' } });
                            } else if (typeStr === 'redpacket') {
                                const args = argsStr.split(/,|，/).map(s => s.trim());
                                const amount = parseFloat(args[0]) || 0;
                                pendingQueue.push({
                                    type: 'redpacket',
                                    content: `红包: ${amount}`,
                                    metadata: { amount: args[0], note: args[1] || '恭喜发财' }
                                });
                            } else if (typeStr === 'transfer') {
                                const args = argsStr.split(/,|，/).map(s => s.trim());
                                const amount = parseFloat(args[0]) || 0;
                                pendingQueue.push({
                                    type: 'transfer',
                                    content: `转账: ${amount}`,
                                    metadata: { amount: args[0], note: args[1] || '转账' }
                                });
                            } else if (typeStr === 'gift') {
                                pendingQueue.push({
                                    type: 'gift',
                                    content: argsStr,
                                    metadata: { giftName: argsStr }
                                });
                            } else if (typeStr === 'image' || typeStr === '图片') {
                                pendingQueue.push({
                                    type: 'image',
                                    content: argsStr,
                                    metadata: { description: argsStr }
                                });
                            } else if (typeStr === 'translation') {
                                pendingQueue.push({
                                    type: 'translation',
                                    content: argsStr,
                                    metadata: { originalText: argsStr }
                                });
                            }

                            // 3. Update Buffer (Remove processed part)
                            buffer = buffer.substring(match.index + match[0].length);

                            // 4. Recurse (Find next command in remaining buffer)
                            processBuffer(finalFlush);
                        } else {
                            // No commands found in current buffer.
                            // If finalizing, dump everything.
                            // If streaming, only dump if we see newlines (safe flush).
                            if (finalFlush && buffer.trim()) {
                                pendingQueue.push({ type: 'text', content: buffer });
                                buffer = '';
                            } else if (buffer.includes('\n')) {
                                // Flush safe paragraphs (single newline for more dynamic splitting)
                                const parts = buffer.split('\n');
                                while (parts.length > 1) {
                                    const p = parts.shift();
                                    // Don't flush if it looks like a potential Translation tag (incomplete)
                                    if (p.trim() && !p.includes('[Translation')) {
                                        pendingQueue.push({ type: 'text', content: p });
                                    } else if (p.includes('[Translation')) {
                                        // Keep it in buffer for finalFlush
                                        parts.unshift(p);
                                        break;
                                    }
                                }
                                buffer = parts.join('\n');
                            }
                        }
                    };

                    processBuffer(false);
                    processQueue();
                },
                (fullText) => {
                    // Flush remaining buffer by recursing one last time with finalSplash=true
                    // We need to re-define or access the processBuffer helper. 
                    // Since it's closure-scoped to onDelta, we can't access it.
                    // We must DUPLICATE the logic here briefly or Refactor. 
                    // To be safe and quick: Duplicate the robust check for the final buffer chunk.

                    if (buffer.trim()) {
                        const CMD_REGEX = /\[(Sticker|RedPacket|Transfer|Gift|Image|图片|Translation)[:：]\s*(.*?)\]/i;
                        const processFinal = () => {
                            const match = buffer.match(CMD_REGEX);
                            if (match) {
                                if (match.index > 0) {
                                    const textBefore = buffer.substring(0, match.index);
                                    if (textBefore.trim()) pendingQueue.push({ type: 'text', content: textBefore });
                                }
                                const typeStr = match[1].toLowerCase();
                                const argsStr = match[2].trim();

                                if (typeStr === 'sticker') {
                                    pendingQueue.push({ type: 'sticker', content: argsStr, metadata: { stickerUrl: '' } });
                                } else if (typeStr === 'redpacket') {
                                    const args = argsStr.split(/,|，/).map(s => s.trim());
                                    const amount = parseFloat(args[0]) || 0;
                                    pendingQueue.push({ type: 'redpacket', content: `红包: ${amount}`, metadata: { amount: args[0], note: args[1] || '恭喜发财' } });
                                } else if (typeStr === 'transfer') {
                                    const args = argsStr.split(/,|，/).map(s => s.trim());
                                    const amount = parseFloat(args[0]) || 0;
                                    pendingQueue.push({ type: 'transfer', content: `转账: ${amount}`, metadata: { amount: args[0], note: args[1] || '转账' } });
                                } else if (typeStr === 'gift') {
                                    pendingQueue.push({ type: 'gift', content: argsStr, metadata: { giftName: argsStr } });
                                } else if (typeStr === 'image' || typeStr === '图片') {
                                    pendingQueue.push({ type: 'image', content: argsStr, metadata: { description: argsStr } });
                                } else if (typeStr === 'translation') {
                                    pendingQueue.push({ type: 'translation', content: argsStr, metadata: { originalText: argsStr } });
                                }

                                buffer = buffer.substring(match.index + match[0].length);
                                processFinal();
                            } else {
                                if (buffer.trim()) pendingQueue.push({ type: 'text', content: buffer });
                            }
                        };
                        processFinal();
                    }

                    processQueue().then(() => {
                        setIsTyping(false);
                        db.conversations.update(conversationId, { updatedAt: Date.now() });
                    });
                },
                (error) => {
                    setIsTyping(false);
                    console.error(error);
                },
                { max_tokens: maxTokens > 0 ? maxTokens : undefined }
            );

        } catch (e) {
            console.error(e);
            setIsTyping(false);
        }
    };

    // --- Sending Logic ---

    // 1. Send Text (Stacked or Trigger)





    // --- Sending Logic ---

    // 0. Regenerate Last Helper
    const handleRegenerateLast = async () => {
        // Find the index of the last message sent by the user
        const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === 'user');

        if (lastUserMsgIndex === -1) {
            alert('没有可重新生成的对话轮次');
            return;
        }

        const actualIndex = messages.length - 1 - lastUserMsgIndex;
        // All assistant messages after that user message are part of the "last turn"
        const assistantMsgsToClear = messages.slice(actualIndex + 1).filter(m => m.role === 'assistant');

        if (assistantMsgsToClear.length > 0) {
            // Delete them from DB
            for (const msg of assistantMsgsToClear) {
                await db.messengerMessages.delete(msg.id);
            }

            setShowExtras(false);
            triggerHaptic();

            // Re-trigger runAI. Since the last assistant messages are gone, 
            // the AI will generate a fresh response for the last user message.
            await runAI(null);
        } else {
            // If the last message is a user message with no AI response yet
            setShowExtras(false);
            await runAI(null);
        }
    };

    // 1. Send Text (Stacked or Trigger)
    const handleSendBtnClick = async () => {
        triggerHaptic();

        if (input.trim()) {
            // Case A: Has text. Add text, THEN trigger AI.
            const text = input.trim();
            setInput('');
            setShowExtras(false);

            // Handle Quote
            let contentToSend = text;
            if (replyTo) {
                contentToSend = `[Quote: ${replyTo.name} said "${replyTo.content}"]\n${text}`;
                setReplyTo(null);
            }

            await db.messengerMessages.add({
                conversationType: 'single',
                conversationId: safeCid,
                role: 'user',
                content: contentToSend,
                msgType: 'text',
                timestamp: Date.now()
            });
            await runAI(null); // Context builder will pick up the just-added msg from DB
        } else {
            // Case B: Empty text. Just trigger AI (for stacked messages).
            await runAI(null);
        }
    };

    // 2. Enter Key (Queue only)
    const handleKeyDown = async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!input.trim()) return;

            const text = input.trim();
            setInput('');
            triggerHaptic();

            // Handle Quote
            let contentToSend = text;
            if (replyTo) {
                contentToSend = `[Quote: ${replyTo.name} said "${replyTo.content}"]\n${text}`;
                setReplyTo(null);
            }

            // Just add to DB, do NOT trigger AI
            await db.messengerMessages.add({
                conversationType: 'single',
                conversationId: safeCid,
                role: 'user',
                content: contentToSend,
                msgType: 'text',
                timestamp: Date.now()
            });
            // User can keep typing / pressing enter to stack messages, then click Send to run AI
        }
    };

    // 3. Handle Rich Media Submit
    // 3. Handle Rich Media Submit
    const handleModalSubmit = async (data) => {
        // data has structure: { type, content, metadata: { ... } }
        const { type, content, metadata } = data; // Check structure in ActionModal submit

        await db.messengerMessages.add({
            conversationType: 'single',
            conversationId: safeCid,
            role: 'user', // "User Sent..." so role is User
            content: content, // The text description for AI
            msgType: type,   // 'image', 'gift', 'transfer', 'redpacket'
            metadata: metadata || {}, // Use the inner metadata object directly
            timestamp: Date.now()
        });

        setActionModal(null);
        setShowExtras(false);
        triggerHaptic();
    };



    const handleStickerSelected = async (sticker) => {
        // User manually sending a sticker
        await db.messengerMessages.add({
            conversationType: 'single',
            conversationId: safeCid,
            role: 'user', // User sent
            content: `[Sticker: ${sticker.name}]`,
            msgType: 'sticker',
            metadata: { stickerUrl: sticker.url },
            timestamp: Date.now()
        });
        setShowExtras(false);
        triggerHaptic();

        // Should AI react? Yes.
        await runAI(null);
    };

    const renderBubbleContent = (msg) => {
        if (!msg.msgType || msg.msgType === 'text' || msg.msgType === 'txt') {
            // Regex to match the Quote pattern: [Quote: Name said "Content"]\nActualText
            const quoteMatch = msg.content.match(/^\[Quote:\s*(.*?)\s*said\s*"(.*?)"\]\n?([\s\S]*)/i);

            if (quoteMatch) {
                const [_, author, quotedContent, actualText] = quoteMatch;
                const isUser = msg.role === 'user';

                return (
                    <div className="flex flex-col gap-2 min-w-[120px] max-w-full">
                        {/* Minimalist Quote Design (Telegram Style) */}
                        <div className="flex gap-2.5 py-0.5 select-none touch-none">
                            {/* Vertical Accent Bar */}
                            <div className={`w-[3px] rounded-full shrink-0 
                                ${isUser ? 'bg-white/50' : 'bg-blue-500/70'}`}
                            />
                            {/* Content */}
                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                <span className={`text-[11px] font-bold tracking-tight
                                    ${isUser ? 'text-white/90' : 'text-blue-500/90'}`}>
                                    {author}
                                </span>
                                <div className={`text-[13px] leading-snug line-clamp-1 italic opacity-80
                                    ${isUser ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {quotedContent}
                                </div>
                            </div>
                        </div>

                        {/* Actual Message content */}
                        <div className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed px-0.5
                            ${isUser ? 'text-white' : 'text-current'}`}>
                            {actualText}
                        </div>
                    </div>
                );
            }
            return <div className="whitespace-pre-wrap break-words">{msg.content}</div>;
        }

        switch (msg.msgType) {
            case 'image':
                return <RichImageBubble content={msg.content} />;
            case 'gift':
                return (
                    <div className="flex items-center gap-3 min-w-[220px] p-3 bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white rounded-2xl border-2 border-pink-100 dark:border-pink-900/30 shadow-sm">
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center shrink-0">
                            <Gift size={24} className="text-pink-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold opacity-90">送出礼物</span>
                            <span className="text-base font-bold text-pink-500">{msg.metadata?.giftName || msg.content}</span>
                        </div>
                    </div>
                );
            case 'transfer':
                // msg.metadata.amount should be string or number.
                const amount = msg.metadata?.amount || '0.00';
                const formattedAmount = parseFloat(amount).toFixed(2);
                const targetName = msg.role === 'user' ? (character?.name || '朋友') : '你';

                return (
                    <div className="flex flex-col min-w-[240px] p-4 bg-[#F79C1D] text-white rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <ArrowRightLeft size={20} className="text-white" />
                            </div>
                            <div className="flex flex-col text-white">
                                <span className="text-sm opacity-80">转账给{targetName}</span>
                                <span className="text-lg font-bold">¥{formattedAmount}</span>
                            </div>
                        </div>
                        <div className="border-t border-white/20 pt-1">
                            <span className="text-xs text-white/50">{msg.metadata?.note || '微信转账'}</span>
                        </div>
                    </div>
                );
            case 'redpacket':
                return (
                    <div className="flex flex-col min-w-[240px] p-4 bg-[#EA5F39] text-white rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-yellow-100/20 rounded-lg flex items-center justify-center">
                                <Wallet size={20} className="text-yellow-200" />
                            </div>
                            <div className="flex flex-col text-white">
                                <span className="text-base font-bold truncate max-w-[140px]">{msg.metadata?.note || '恭喜发财'}</span>
                                <span className="text-xs opacity-80">查看红包</span>
                            </div>
                        </div>
                        <div className="border-t border-white/10 pt-1">
                            <span className="text-xs text-white/50">微信红包</span>
                        </div>
                    </div>
                );
            case 'sticker':
                return <StickerBubble stickerName={msg.content} />;
            case 'translation':
                // Use basic text bubble style
                return <div className="whitespace-pre-wrap break-words text-sm opacity-80">{msg.content}</div>;
            default:
                return <div>{msg.content}</div>;
        }
    };

    // Bubble Style Helpers (Union Logic)
    const getBubbleStyle = (msg, index, allMessages) => {
        const isUser = msg.role === 'user';
        const prevMsg = allMessages[index - 1];
        const nextMsg = allMessages[index + 1];

        // Union Checks
        const isFirst = !prevMsg || prevMsg.role !== msg.role;
        const isLast = !nextMsg || nextMsg.role !== msg.role;

        // Base classes
        // Note: AI bubble now uses 'items-start' alignment in flex parent, User uses 'items-end'
        let borderRadius = 'rounded-2xl'; // Default full round

        // Dynamic Corners for Union Effect
        if (!isFirst && !isLast) {
            // Middle: Same Sender above and below
            borderRadius = isUser ? 'rounded-2xl rounded-r-sm' : 'rounded-2xl rounded-l-sm';
        } else if (isFirst && !isLast) {
            // First in group: Round top, flat bottom-side
            borderRadius = isUser ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm';
        } else if (!isFirst && isLast) {
            // Last in group: Flat top-side, Round bottom
            borderRadius = isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
        }
        // If isFirst && isLast (Single message), keep full rounded-2xl

        const base = `max-w-[68%] relative cursor-pointer text-[14px] leading-snug transition-all ${borderRadius} `;

        // Special Cards (Rich Media) -> No Padding/Color
        if (['sticker', 'image', 'gift', 'transfer', 'redpacket'].includes(msg.msgType)) {
            return "max-w-[80%] relative cursor-pointer " + borderRadius; // Apply roundness to media too
        }

        // Standard Text Bubbles
        if (isUser) {
            // Gradient Blue
            return base + "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 text-white px-3 py-2 shadow-lg shadow-blue-500/20";
        } else if (msg.role === 'system') {
            return "";
        } else {
            // AI Text (White/Dark Gray with Glass Effect)
            return base + "bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl text-gray-900 dark:text-white px-3 py-2 shadow-md border border-gray-200/50 dark:border-white/10";
        }
    };

    // --- Settings Actions ---
    const updateHistoryLimit = async (limit) => {
        setHistoryLimit(limit);
        await db.conversations.update(safeCid, { historyLimit: limit });
        triggerHaptic();
    };

    const updateReplyCount = async (count) => {
        setReplyCount(count);
        await db.conversations.update(safeCid, { replyCount: count });
        triggerHaptic();
    };

    // --- Message Actions ---
    // (Copy/Delete/Edit moved to Context Menu)

    const handleRegenerate = async (msgId) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg || msg.role !== 'assistant') return;

        setSelectedMsg(null);
        await db.messengerMessages.update(msgId, { content: '...' });
        setIsTyping(true);

        const lastUserMsg = await db.messengerMessages
            .where('[conversationType+conversationId]')
            .equals(['single', safeCid])
            .filter(m => m.role === 'user' || m.role === 'system')
            .last();

        const textToCheck = lastUserMsg ? lastUserMsg.content : '...';

        try {
            const contextMessages = await llmService.buildContext(characterId, conversationId, textToCheck, { historyLimit, replyCount });
            let currentContent = '';
            await llmService.sendMessageStream(
                contextMessages,
                (delta) => {
                    currentContent += delta;
                    db.messengerMessages.update(msgId, { content: currentContent });
                },
                (fullText) => {
                    setIsTyping(false);
                    db.messengerMessages.update(msgId, { content: fullText });
                    triggerHaptic();
                },
                () => setIsTyping(false)
            );
        } catch (e) {
            setIsTyping(false);
        }
    };

    // --- Context Menu Actions ---
    const handleQuote = (msg) => {
        setReplyTo({ id: msg.id, content: msg.content, name: msg.role === 'user' ? 'Me' : character?.name });
        setSelectedMsg(null);
        triggerHaptic();
    };

    const handleCopy = (msg) => {
        navigator.clipboard.writeText(msg.content);
        setSelectedMsg(null);
        triggerHaptic();
    };

    const handleRevoke = async (msg) => {
        if (!confirm('确定撤回这条消息吗?')) { setSelectedMsg(null); return; }
        await db.messengerMessages.update(msg.id, {
            msgType: 'revoked',
            content: msg.role === 'user' ? '你撤回了一条消息' : `${character?.name || '对方'} 撤回了一条消息` // Only fallback content
        });
        setSelectedMsg(null);
        triggerHaptic();
    };

    const handleDelete = async (msg) => {
        if (!confirm('确定删除吗?')) { setSelectedMsg(null); return; }
        await db.messengerMessages.delete(msg.id);
        setSelectedMsg(null);
        triggerHaptic();
    };

    const handleEdit = async (msg) => {
        const newContent = prompt('编辑消息:', msg.content);
        if (newContent !== null && newContent.trim() !== '' && newContent !== msg.content) {
            await db.messengerMessages.update(msg.id, { content: newContent });
            triggerHaptic();
        }
        setSelectedMsg(null);
    };

    // --- Render ---
    const headerContent = (
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onProfile(characterId)}>
            <Avatar src={character?.avatar} name={character?.name} size={32} className="rounded-lg" />
            <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="font-semibold text-[16px] text-gray-900 dark:text-white">{character?.name || 'Loading'}</span>
            </div>
        </div>
    );

    const rightButton = (
        <button onClick={() => onSettings(safeCid, characterId)} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-[#2C2C2E]">
            <MoreHorizontal size={20} className="text-gray-900 dark:text-white" />
        </button>
    );

    return (
        <IOSPage title={headerContent} onBack={onBack} rightButton={rightButton}>
            <div className="flex flex-col h-full bg-transparent">
                <style>{`
                    /* Message Animation for Virtual List feeling */
                    .msg-enter { animation: msg-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                    @keyframes msg-pop { from { opacity: 0; transform: translateY(10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                `}</style>

                {/* Wallpaper Logic - z-index set higher to show above base */}
                <div className="absolute inset-0 z-[1] pointer-events-none">
                    {/* 1. Base Dark Texture (Default) */}
                    <div className="absolute inset-0 bg-[#F2F2F7] dark:bg-[#000000]"></div>
                    {/* 2. Custom Wallpaper (If set) */}
                    {/* 2. Custom Wallpaper (If set) */}
                    {displayWallpaper && (
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
                            style={{ backgroundImage: `url(${displayWallpaper})` }}
                        />
                    )}
                    {/* 3. Overlay for text readability (Optional) */}
                    {conversation?.wallpaperMask !== false && (
                        <div className="absolute inset-0 bg-white/30 dark:bg-black/20 backdrop-blur-[2px]"></div>
                    )}
                </div>

                {/* Custom CSS Injection (Disabled for safety) */}
                {/* {customGlobalCss && <style>{customGlobalCss}</style>} */}
                {/* {customBubbleCss && <style>{customBubbleCss}</style>} */}

                {/* Messages List */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 relative z-10" onClick={() => { setSelectedMsg(null); setShowMenu(false); }}>
                    {/* Debug / Empty State */}
                    {(!messages || messages.length === 0) && (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <MessageCircle size={48} className="mb-2" />
                            <span>暂无消息</span>
                        </div>
                    )}

                    {messages?.map((msg, index) => {
                        const isText = !msg.msgType || msg.msgType === 'text' || msg.msgType === 'txt';

                        // Timestamp Logic (Show if gap > 5 mins)
                        const prevMsg = messages[index - 1];
                        const showTime = !prevMsg || (msg.timestamp - prevMsg.timestamp > 5 * 60 * 1000);

                        // Handle System or Revoked Messages
                        if (msg.role === 'system' || msg.msgType === 'revoked') {
                            return (
                                <div key={msg.id} className="flex flex-col gap-2 my-1.5 msg-enter">
                                    {showTime && (
                                        <div className="flex justify-center mb-1">
                                            <span className="text-[10px] text-gray-400/60 font-medium tracking-tight bg-black/5 dark:bg-white/5 py-0.5 px-2 rounded-md">{formatTimestamp(msg.timestamp)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-center">
                                        <span className="text-[11px] text-gray-400/80 py-0.5 px-3 bg-gray-100/50 dark:bg-white/5 rounded-full text-center">{msg.content}</span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id} className="flex flex-col gap-1.5 msg-enter relative" style={{ zIndex: selectedMsg === msg.id ? 50 : 'auto' }}>
                                {showTime && (
                                    <div className="flex justify-center my-4">
                                        <span className="text-[10px] text-gray-500/80 dark:text-gray-400/80 font-medium tracking-tight bg-black/5 dark:bg-white/5 py-0.5 px-2 rounded-md">
                                            {formatTimestamp(msg.timestamp)}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {/* AI Avatar */}
                                    {msg.role === 'assistant' && avatarMode !== 'none' && (
                                        <div className="w-8 shrink-0 flex justify-center mt-0.5">
                                            {(avatarMode !== 'smart' || (!messages[index - 1] || messages[index - 1].role !== 'assistant')) && (
                                                <Avatar
                                                    src={character ? (storageService.getCachedBlobUrl('characters', character.id) || character.avatar) : null}
                                                    name={character?.name}
                                                    size={32}
                                                    className="rounded-full shadow-sm"
                                                />
                                            )}
                                        </div>
                                    )}

                                    <div
                                        onContextMenu={(e) => { e.preventDefault(); triggerHaptic(); setSelectedMsg(msg.id); }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedMsg(selectedMsg === msg.id ? null : msg.id); }}
                                        // Pass index and all messages for Union Logic
                                        className={`${getBubbleStyle(msg, index, messages)} ${isText ? (msg.role === 'user' ? 'bubble-user-shadow' : 'bubble-ai-shadow') : ''}`}
                                        style={
                                            // Dynamic Background Image Check
                                            isText ? {} : { boxShadow: 'none', background: 'transparent' }
                                        }
                                    >
                                        {renderBubbleContent(msg)}

                                        {/* Context Menu */}
                                        <AnimatePresence>
                                            {selectedMsg === msg.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: (index >= messages.length - 2) ? 5 : -5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className={`absolute z-[100] ${(index >= messages.length - 2) ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'} ${msg.role === 'user' ? 'right-0 origin-right' : 'left-0 origin-left'} flex flex-row items-center bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl p-[2px] gap-px whitespace-nowrap overflow-hidden`}
                                                >
                                                    {msg.role === 'assistant' && (
                                                        <button onClick={() => handleQuote(msg)} className="flex flex-col items-center justify-center w-8 h-8 text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all active:scale-95 gap-0">
                                                            <Reply size={11} /><span className="text-[7.5px] font-medium scale-90">引用</span>
                                                        </button>
                                                    )}

                                                    <button onClick={() => handleEdit(msg)} className="flex flex-col items-center justify-center w-8 h-8 text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all active:scale-95 gap-0">
                                                        <Edit2 size={11} /><span className="text-[7.5px] font-medium scale-90">编辑</span>
                                                    </button>

                                                    <button onClick={() => handleCopy(msg)} className="flex flex-col items-center justify-center w-8 h-8 text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all active:scale-95 gap-0">
                                                        <Copy size={11} /><span className="text-[7.5px] font-medium scale-90">复制</span>
                                                    </button>

                                                    <button onClick={() => handleRevoke(msg)} className="flex flex-col items-center justify-center w-8 h-8 text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all active:scale-95 gap-0">
                                                        <RotateCcw size={11} /><span className="text-[7.5px] font-medium scale-90 text-red-500/80">撤回</span>
                                                    </button>

                                                    <div className="w-[1px] h-4 bg-black/10 dark:bg-white/10 mx-0.5 self-center" />

                                                    <button onClick={() => handleDelete(msg)} className="flex flex-col items-center justify-center w-8 h-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-95 gap-0">
                                                        <Trash2 size={11} /><span className="text-[7.5px] font-medium scale-90">删除</span>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* User Avatar */}
                                    {msg.role === 'user' && avatarMode !== 'none' && avatarMode !== 'ai_only' && (
                                        <div className="w-8 shrink-0 flex justify-center mt-0.5">
                                            {(avatarMode !== 'smart' || (!messages[index - 1] || messages[index - 1].role !== 'user')) && (
                                                <Avatar
                                                    src={userPersona ? (storageService.getCachedBlobUrl('userPersonas', userPersona.id) || userPersona.avatar) : null}
                                                    name={userPersona?.userName || 'Me'}
                                                    size={32}
                                                    className="rounded-full shadow-sm"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {isTyping && (
                        <div className="pt-4 pb-2 ml-5">
                            <span className="text-gray-400/70 text-[12px] font-medium animate-pulse">对方正在输入...</span>
                        </div>
                    )}
                </div>

                {/* Extras Panel Interaction Overlay */}
                {
                    showExtras && (
                        <div
                            className="fixed inset-0 z-40 bg-black/0"
                            onClick={() => setShowExtras(false)}
                        />
                    )
                }

                {/* Extras Panel (Floating Card Style) */}
                <AnimatePresence>
                    {showExtras && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="absolute bottom-24 left-12 right-12 bg-white/8 dark:bg-[#1C1C1E]/8 backdrop-blur-3xl rounded-[24px] shadow-2xl border border-black/5 dark:border-white/5 p-3 z-50"
                        >
                            <div className="grid grid-cols-4 gap-y-3 gap-x-1 p-3 pb-4">
                                <ExtraBtn icon={ImageIcon} label="图片" onClick={() => setActionModal({ type: 'image', label: '发送图片' })} />
                                <ExtraBtn icon={Smile} label="表情" onClick={() => setActionModal({ type: 'sticker_manager', label: '表情包' })} color="text-yellow-500 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-900/30" />
                                <ExtraBtn icon={Gift} label="礼物" onClick={() => setActionModal({ type: 'gift', label: '送礼物' })} color="text-pink-500 dark:text-pink-400" bg="bg-pink-50 dark:bg-pink-900/30" />
                                <ExtraBtn icon={Wallet} label="转账" onClick={() => setActionModal({ type: 'transfer', label: '转账' })} color="text-blue-500 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/30" />
                                <ExtraBtn icon={MoreHorizontal} label="红包" onClick={() => setActionModal({ type: 'redpacket', label: '发红包' })} color="text-red-500 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/30" />
                                <ExtraBtn icon={Sparkles} label="重新生成" onClick={handleRegenerateLast} color="text-purple-500 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/30" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Quote Preview */}
                <AnimatePresence>
                    {replyTo && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mx-3 mb-2 p-3 bg-white/80 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-2xl flex items-center justify-between border-l-4 border-blue-500 relative z-40 shadow-lg"
                        >
                            <div className="flex flex-col text-sm overflow-hidden pr-2 flex-1 min-w-0">
                                <span className="font-bold text-blue-500 text-xs mb-1">引用 {replyTo.name}</span>
                                <span className="truncate text-gray-700 dark:text-gray-300 text-[13px]">{replyTo.content}</span>
                            </div>
                            <button onClick={() => setReplyTo(null)} className="p-2 -mr-1 text-gray-400 hover:text-gray-600 active:bg-gray-200 dark:active:bg-white/10 rounded-full shrink-0 transition-colors">
                                <X size={18} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>



                {/* Input Area (Floating Capsule) */}
                <div className="shrink-0 pb-[var(--sab)] px-3 pt-2 pointer-events-none z-50">
                    {/* Floating Container */}
                    <div className="pointer-events-auto flex items-end gap-2 bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[28px] p-1.5 pl-2 shadow-lg mb-2">

                        <button
                            onClick={() => { setShowExtras(!showExtras); triggerHaptic(); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 mb-0.5 ${showExtras ? 'bg-gray-200 dark:bg-[#3A3A3C] rotate-45' : 'hover:bg-gray-200 dark:hover:bg-[#3A3A3C]'}`}
                        >
                            <PlusCircle size={22} className="text-gray-500" />
                        </button>

                        <div className="flex-1 min-h-[40px] flex items-center py-1">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="发消息..."
                                rows={1}
                                onKeyDown={handleKeyDown}
                                className="flex-1 bg-transparent text-[16px] dark:text-white resize-none max-h-32 focus:outline-none px-2 py-1"
                            />
                        </div>

                        {/* Animated Send Button */}
                        <motion.button
                            onClick={handleSendBtnClick}
                            whileTap={{ scale: 0.9 }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all mb-0.5 ${input.trim()
                                ? 'bg-[#5B7FFF] shadow-md cursor-pointer'
                                : 'bg-gray-200 dark:bg-[#3A3A3C] cursor-not-allowed opacity-80'
                                }`}
                        >
                            <Send size={18} className={input.trim() ? "text-white ml-0.5" : "text-gray-400 ml-0.5"} />
                        </motion.button>
                    </div>

                </div>
            </div>

            {/* Action Modal */}
            <AnimatePresence>
                {actionModal && (
                    <ActionModal
                        action={actionModal}
                        onClose={() => setActionModal(null)}
                        onSubmit={handleModalSubmit}
                        onStickerSelect={handleStickerSelected}
                    />
                )}
            </AnimatePresence>

            {/* Top Right Menu (Drawer Style) */}
            <SettingsDrawer
                isOpen={showMenu}
                onClose={() => setShowMenu(false)}
                conversationId={safeCid}
                characterId={characterId}
                initialHistory={historyLimit}
                initialReply={replyCount}
                initialNoPunc={noPunctuation}
                onSave={async (newSettings) => {
                    const { history, reply, noPunc } = newSettings;
                    setHistoryLimit(history);
                    setReplyCount(reply);
                    setNoPunctuation(noPunc);
                    await db.conversations.update(safeCid, {
                        historyLimit: history,
                        replyCount: reply,
                        noPunctuation: noPunc
                    });
                    triggerHaptic();
                    setShowMenu(false);
                }}
                onProfile={() => { setShowMenu(false); onProfile(characterId); }}
                onClearHistory={async () => {
                    if (confirm('确定清空?')) {
                        await db.messengerMessages.where('[conversationType+conversationId]').equals(['single', conversationId]).delete();
                        setShowMenu(false);
                    }
                }}
                // Pass a checker function for live preview
                onEstimateTokens={async (tempHistory, tempReply, tempNoPunc) => {
                    const context = await llmService.buildContext(characterId, conversationId, '', {
                        historyLimit: tempHistory,
                        replyCount: tempReply,
                        noPunctuation: tempNoPunc
                    });
                    const fullText = context.map(m => m.content).join('\n');
                    return llmService.estimateTokens(fullText);
                }}
            />
        </IOSPage >
    );
};

// --- Sub Components ---

const SettingsDrawer = ({ isOpen, onClose, initialHistory, initialReply, initialNoPunc, onSave, onProfile, onClearHistory, onEstimateTokens, conversationId, characterId }) => {
    // Local Pending State (Use strings for better input control)
    // Local Pending State
    const [historyStr, setHistoryStr] = useState('');
    const [replyMinStr, setReplyMinStr] = useState('2');
    const [replyMaxStr, setReplyMaxStr] = useState('8');
    const [noPunctuation, setNoPunctuation] = useState(false);
    const [tokens, setTokens] = useState(0);

    // Helper to get raw character data for initial status
    const safeId = parseInt(conversationId) || conversationId;
    const conversation = useLiveQuery(() => {
        if (!safeId) return undefined;
        return db.conversations.get(safeId);
    }, [conversationId]); // Re-run when prompt ID changes

    // Reactive Storage
    const [storageVersion, setStorageVersion] = React.useState(0);
    React.useEffect(() => {
        return storageService.subscribe(() => setStorageVersion(v => v + 1));
    }, []);

    // Unified Wallpaper Resolver
    const displayWallpaper = React.useMemo(() => {
        if (!conversation?.wallpaper) return null;
        if (conversation.wallpaper.startsWith('idb:')) {
            const cached = storageService.getCachedBlobUrl(conversation.wallpaper);
            return cached || null;
        }
        return conversation.wallpaper;
    }, [conversation?.wallpaper, storageVersion]);

    // Handle Wallpaper Upload (Blob)
    const handleWallpaperUpload = async (e) => {
        const file = e.target.files[0];
        console.log('[Wallpaper] File selected:', file?.name, 'safeId:', safeId);
        if (file && safeId) {
            try {
                await storageService.saveBlob('chatWallpapers', safeId, file, 'data');
                const ref = storageService.getReference('chatWallpapers', safeId);
                await db.conversations.update(safeId, { wallpaper: ref });
                triggerHaptic();
                console.log('[Wallpaper] Upload SUCCESS for id:', safeId);
            } catch (err) {
                console.error('[Wallpaper] Upload FAILED:', err);
                alert('背景上传失败');
            }
        }
    };

    const handleWallpaperUrl = async (url) => {
        console.log('[Wallpaper] URL input:', url, 'safeId:', safeId);
        if (safeId) {
            try {
                await db.conversations.update(safeId, { wallpaper: url });
                console.log('[Wallpaper URL] DB Update SUCCESS');
            } catch (err) {
                console.error('[Wallpaper URL] DB Update FAILED:', err);
            }
        }
    };


    // Initial Sync
    useEffect(() => {
        if (isOpen) {
            setHistoryStr(initialHistory === 0 ? '' : String(initialHistory));
            const str = String(initialReply);
            if (str.includes('-')) {
                const [min, max] = str.split('-');
                setReplyMinStr(min);
                setReplyMaxStr(max);
            } else {
                setReplyMinStr(str);
                setReplyMaxStr(str);
            }
            setNoPunctuation(initialNoPunc || false);
        }
    }, [isOpen, initialHistory, initialReply, initialNoPunc]);

    // Live Token Preview Logic
    useEffect(() => {
        if (isOpen && onEstimateTokens) {
            const timer = setTimeout(async () => {
                const h = parseInt(historyStr) || 0;
                const r = `${replyMinStr || 1}-${replyMaxStr || 1}`;
                const count = await onEstimateTokens(h, r, noPunctuation);
                setTokens(count);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, historyStr, replyMinStr, replyMaxStr, noPunctuation]);

    const handleSave = () => {
        const h = parseInt(historyStr) || 0;
        const min = parseInt(replyMinStr) || 1;
        const max = parseInt(replyMaxStr) || 1;

        if (min > max) {
            alert('回复长度最小值不能大于最大值');
            return;
        }
        onSave({ history: h, reply: `${min}-${max}`, noPunc: noPunctuation });
    };

    const history = parseInt(historyStr) || 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="absolute inset-0 z-50 flex justify-end">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-[320px] h-full bg-gradient-to-br from-[#FAFAFA] to-[#F0F0F5] dark:from-[#1C1C1E] dark:to-[#0D0D0F] shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Premium Header - Aligned with main nav */}
                        <div className="relative shrink-0 pt-[var(--sat)] bg-gradient-to-r from-[#5B7FFF]/5 via-transparent to-[#A78BFA]/5">
                            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200/50 dark:border-white/5">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Settings size={18} className="text-[#5B7FFF]" />
                                    聊天设置
                                </h2>
                                <button onClick={onClose} className="p-1.5 rounded-full bg-gray-200/80 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                    <X size={14} className="text-gray-500 dark:text-gray-300" />
                                </button>
                            </div>
                        </div>

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
                                            {displayWallpaper ? (
                                                <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url(${displayWallpaper})` }} />
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
                                                // Ensure safeId is used
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
                                    <MenuItem icon={User} label="查看角色资料" onClick={onProfile} />
                                    <div className="h-[1px] bg-gray-100 dark:bg-white/5 mx-4" />
                                    <MenuItem icon={Trash2} label="清空聊天记录" danger onClick={onClearHistory} />
                                </div>
                            </div>

                            <div className="h-6" />
                        </div>

                        {/* Save Button - Premium */}
                        <div className="p-5 border-t border-gray-200/50 dark:border-white/5 bg-gradient-to-t from-[#FAFAFA] to-transparent dark:from-[#1C1C1E] dark:to-transparent">
                            <motion.button
                                onClick={handleSave}
                                whileTap={{ scale: 0.97 }}
                                className="w-full py-4 bg-gradient-to-r from-[#5B7FFF] to-[#7C3AED] active:opacity-90 transition-all text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30"
                            >
                                保存配置
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};


const MenuBtn = ({ icon: Icon, onClick, danger }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={`p-2 rounded-lg hover:bg-white/20 active:scale-95 transition-transform ${danger ? 'text-red-400' : 'text-white'}`}>
        <Icon size={16} />
    </button>
);

const ExtraBtn = ({ icon: Icon, label, onClick, color = 'text-gray-700 dark:text-gray-200', bg = 'bg-white dark:bg-[#2C2C2E]' }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 active:scale-95 transition-transform shrink-0">
        <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center shadow-sm border border-black/5 dark:border-white/5`}>
            <Icon size={26} className={`${color} shrink-0`} />
        </div>
        <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </button>
);

const MenuItem = ({ icon: Icon, label, onClick, danger }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 active:bg-gray-100 dark:active:bg-[#2C2C2E] rounded-xl text-left">
        <Icon size={20} className={danger ? 'text-red-500' : 'text-gray-900 dark:text-white'} />
        <span className={`text-[16px] font-medium ${danger ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{label}</span>
    </button>
);

// --- Action Input Modal / Sticker Manager ---
const ActionModal = ({ action, onClose, onSubmit, onStickerSelect }) => {
    // If type is sticker_manager, render specialized UI
    if (action.type === 'sticker_manager') {
        return (
            <StickerManager
                onClose={onClose}
                onSelect={(s) => {
                    if (onStickerSelect) onStickerSelect(s);
                    // Sticker Manager handles import internally, select handles sending
                }}
            />
        );
    }

    // Fields based on type
    // Fields based on type
    const [field1, setField1] = useState(''); // Image Desc / Gift Name / Amount
    const [field2, setField2] = useState(''); // Note / Content

    const handleSubmit = () => {
        if (!field1.trim()) return;

        // Pass structured data
        let data = { type: action.type, content: '', metadata: {} };

        if (action.type === 'image') {
            data.content = field1; // Image Desc
        } else if (action.type === 'gift') {
            data.content = "送出礼物: " + field1;
            data.metadata = { giftName: field1 };
        } else if (action.type === 'transfer') {
            data.content = "转账: " + field1 + ", 备注: " + field2;
            data.metadata = { amount: field1, note: field2 };
        } else if (action.type === 'redpacket') {
            data.content = "红包: " + field1 + ", 祝福: " + field2;
            data.metadata = { amount: field1, note: field2 };
        }

        onSubmit(data);
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-[#1C1C1E] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{action.label}</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Dynamic Fields */}
                    {action.type === 'image' && (
                        <input className="w-full bg-gray-100 dark:bg-[#2C2C2E] p-3 rounded-xl dark:text-white outline-none" placeholder="描述图片内容..." value={field1} onChange={e => setField1(e.target.value)} autoFocus />
                    )}
                    {action.type === 'gift' && (
                        <input className="w-full bg-gray-100 dark:bg-[#2C2C2E] p-3 rounded-xl dark:text-white outline-none" placeholder="礼物名称..." value={field1} onChange={e => setField1(e.target.value)} autoFocus />
                    )}
                    {action.type === 'transfer' && (
                        <>
                            <input type="number" className="w-full bg-gray-100 dark:bg-[#2C2C2E] p-3 rounded-xl dark:text-white outline-none" placeholder="金额 (¥)" value={field1} onChange={e => setField1(e.target.value)} autoFocus />
                            <input className="w-full bg-gray-100 dark:bg-[#2C2C2E] p-3 rounded-xl dark:text-white outline-none" placeholder="转账备注..." value={field2} onChange={e => setField2(e.target.value)} />
                        </>
                    )}
                    {action.type === 'redpacket' && (
                        <>
                            <input type="number" className="w-full bg-gray-100 dark:bg-[#2C2C2E] p-3 rounded-xl dark:text-white outline-none" placeholder="总金额 (¥)" value={field1} onChange={e => setField1(e.target.value)} autoFocus />
                            <input className="w-full bg-gray-100 dark:bg-[#2C2C2E] p-3 rounded-xl dark:text-white outline-none" placeholder="红包祝福语..." value={field2} onChange={e => setField2(e.target.value)} />
                        </>
                    )}

                    <button onClick={handleSubmit} className="w-full bg-[#5B7FFF] text-white py-3 rounded-xl font-medium active:scale-95 transition-transform">
                        发送
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- Rich Media Components ---

const RichImageBubble = ({ content }) => {
    const [isRevealed, setIsRevealed] = useState(false);

    return (
        <div
            className="w-48 h-48 relative cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-[#2C2C2E] shadow-sm border border-gray-100 dark:border-white/5"
            onClick={(e) => { e.stopPropagation(); setIsRevealed(!isRevealed); }}
        >
            <AnimatePresence initial={false} mode="wait">
                {!isRevealed ? (
                    <motion.div
                        key="placeholder"
                        initial={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-[#3A3A3C]"
                    >
                        <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center mb-2">
                            <ImageIcon size={24} className="text-gray-500/80" />
                        </div>
                        <span className="text-[12px] text-gray-400 font-medium">查看内容</span>
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className="absolute inset-0 p-4 flex items-center justify-center overflow-y-auto"
                    >
                        <span className="text-sm text-gray-800 dark:text-gray-200 text-center whitespace-pre-wrap leading-relaxed select-none">
                            {content}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sticker Bubble ---
const StickerBubble = ({ stickerName }) => {
    // Live query to find the URL for this sticker name
    const sticker = useLiveQuery(() => db.stickers.where('name').equals(stickerName).first(), [stickerName]);

    if (!sticker) {
        // Fallback if sticker not found in DB
        return (
            <div className="bg-gray-100 dark:bg-[#2C2C2E] px-3 py-2 rounded-xl flex items-center gap-2">
                <Smile size={18} className="text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">[{stickerName}]</span>
            </div>
        );
    }

    return (
        <div className="max-w-[150px] max-h-[150px] overflow-hidden rounded-xl">
            <img src={sticker.url} alt={stickerName} className="w-full h-full object-cover" />
        </div>
    );
};

// --- Sticker Manager Modal ---
const StickerManager = ({ onClose, onSelect }) => {
    const [importText, setImportText] = useState('');
    const stickers = useLiveQuery(() => db.stickers.toArray()) || [];

    const handleImport = async () => {
        if (!importText.trim()) return;
        const lines = importText.split('\n');
        let count = 0;
        for (const line of lines) {
            // Support "Name:URL" or "Name URL" or "Name：URL"
            const parts = line.split(/[:：\s]+/);
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const url = parts.slice(1).join('').trim();
                if (name && url) {
                    // Check if exists
                    const exists = await db.stickers.where('name').equals(name).count();
                    if (exists === 0) {
                        await db.stickers.add({ name, url, category: 'default' });
                        count++;
                    }
                }
            }
        }
        alert(`成功导入 ${count} 个表情！`);
        setImportText('');
    };

    const handleDelete = async (id) => {
        await db.stickers.delete(id);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white">表情包管理</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* List */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">点击发送 ({stickers.length})</h4>
                        <div className="grid grid-cols-4 gap-2">
                            {stickers.map(s => (
                                <div key={s.id} className="relative group aspect-square rounded-xl bg-gray-50 dark:bg-black/20 overflow-hidden cursor-pointer active:scale-95 transition-transform"
                                    onClick={() => onSelect && onSelect(s)}
                                >
                                    <img src={s.url} className="w-full h-full object-cover" alt={s.name} />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 text-[10px] text-white text-center truncate">{s.name}</div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Import */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase">批量导入 (格式: 名称:URL)</h4>
                        <textarea
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                            className="w-full h-32 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl p-3 text-sm dark:text-white font-mono placeholder:text-gray-400 outline-none"
                            placeholder={"哈哈: https://...\n哭: https://..."}
                        />
                        <button onClick={handleImport} className="w-full bg-[#5B7FFF] text-white py-2.5 rounded-xl font-semibold active:scale-95 transition-transform">
                            导入表情
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatDetail;
