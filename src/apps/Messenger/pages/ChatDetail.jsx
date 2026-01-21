import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MoreVertical, RotateCcw, Copy, Trash2, User, PlusCircle, Mic, Image as ImageIcon, Smile, Gift, Wallet, MoreHorizontal, X, Edit2, Reply, ChevronRight, Settings, Sparkles, ArrowRightLeft, MessageCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { llmService } from '../../../services/LLMService';
import NotificationService from '../../../services/NotificationService';
import { appRegistry } from '../../../config/appRegistry';

const ChatDetail = ({ conversationId, characterId, onBack, onProfile }) => {
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedMsg, setSelectedMsg] = useState(null);
    const [showExtras, setShowExtras] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Modal State
    const [actionModal, setActionModal] = useState(null); // { type, label, icon... }

    // Settings State
    const [historyLimit, setHistoryLimit] = useState(20);
    const [replyCount, setReplyCount] = useState("2-8"); // Default 2-8 range
    const [noPunctuation, setNoPunctuation] = useState(false); // New state
    const [estTokens, setEstTokens] = useState(0);

    // Custom CSS Injection
    const [customGlobalCss, setCustomGlobalCss] = useState('');
    const [customBubbleCss, setCustomBubbleCss] = useState('');

    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const character = useLiveQuery(() => db.characters.get(characterId), [characterId]);
    const conversation = useLiveQuery(() => db.conversations.get(conversationId), [conversationId]);
    const messages = useLiveQuery(() =>
        db.messengerMessages.where('[conversationType+conversationId]').equals(['single', conversationId]).toArray()
        , [conversationId]);

    // Load Preferences
    useEffect(() => {
        if (conversation) {
            if (conversation.historyLimit !== undefined) setHistoryLimit(conversation.historyLimit);
            if (conversation.replyCount !== undefined) setReplyCount(conversation.replyCount);
            if (conversation.noPunctuation !== undefined) setNoPunctuation(conversation.noPunctuation);
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
                    conversationId,
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
                await new Promise(r => setTimeout(r, 800));
            }

            processingQueue = false;
        };

        try {
            // 2. Build Context
            const contextMessages = await llmService.buildContext(characterId, conversationId, userText, {
                historyLimit,
                replyCount,
                noPunctuation
            });

            // 3. Send Stream
            await llmService.sendMessageStream(
                contextMessages,
                (delta) => {
                    buffer += delta;

                    // Robust Regex to match ANY known command tag anywhere
                    // Captures: 1=Type, 2=Args
                    // Robust Regex to match ANY known command tag anywhere
                    // Captures: 1=Type, 2=Args
                    const CMD_REGEX = /\[(Sticker|RedPacket|Transfer|Gift|Image|图片)[:：]\s*(.*?)\]/i;

                    // Helper to process buffer recursively
                    const processBuffer = (finalFlush = false) => {
                        const match = buffer.match(CMD_REGEX);
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
                                    if (p.trim()) pendingQueue.push({ type: 'text', content: p });
                                }
                                buffer = parts[0];
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
                        const CMD_REGEX = /\[(Sticker|RedPacket|Transfer|Gift|Image|图片)[:：]\s*(.*?)\]/i;
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
                }
            );

        } catch (e) {
            console.error(e);
            setIsTyping(false);
        }
    };

    // --- Sending Logic ---

    // 1. Send Text (Stacked or Trigger)





    // --- Sending Logic ---

    // 1. Send Text (Stacked or Trigger)
    const handleSendBtnClick = async () => {
        triggerHaptic();

        if (input.trim()) {
            // Case A: Has text. Add text, THEN trigger AI.
            const text = input.trim();
            setInput('');
            setShowExtras(false);

            await db.messengerMessages.add({
                conversationType: 'single',
                conversationId,
                role: 'user',
                content: text,
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

            // Just add to DB, do NOT trigger AI
            await db.messengerMessages.add({
                conversationType: 'single',
                conversationId,
                role: 'user',
                content: text,
                timestamp: Date.now()
            });
        }
    };

    // 3. Handle Rich Media Submit
    // 3. Handle Rich Media Submit
    const handleModalSubmit = async (data) => {
        // data has structure: { type, content, metadata: { ... } }
        const { type, content, metadata } = data; // Check structure in ActionModal submit

        await db.messengerMessages.add({
            conversationType: 'single',
            conversationId,
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
            conversationId,
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

    // --- Render Bubble Content ---
    const renderBubbleContent = (msg) => {
        if (!msg.msgType || msg.msgType === 'text') {
            return <div className="whitespace-pre-wrap break-words">{msg.content}</div>;
        }

        switch (msg.msgType) {
            case 'image':
                return <RichImageBubble content={msg.content} />;
            case 'gift':
                return (
                    <div className="flex items-center gap-3 min-w-[160px] p-1">
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

                // Determine target name
                const targetName = msg.role === 'user'
                    ? (character?.name || '朋友')
                    : '你';

                return (
                    <div className="flex flex-col min-w-[200px]">
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
                    <div className="flex flex-col min-w-[200px]">
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
            default:
                return <div>{msg.content}</div>;
        }
    };

    // Bubble Style Helpers
    const getBubbleStyle = (msg) => {
        const base = "max-w-[75%] shadow-sm relative cursor-pointer text-[16px] leading-relaxed ";
        if (msg.role === 'user') {
            if (msg.msgType === 'sticker') return base + "bg-transparent p-0";
            const userBase = base + "bubble-user-tail ";
            if (msg.msgType === 'image') return userBase + "bg-white p-1 rounded-2xl";
            if (msg.msgType === 'gift') return userBase + "bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white px-4 py-3 rounded-2xl border-2 border-pink-100 dark:border-pink-900/30";
            if (msg.msgType === 'transfer') return userBase + "bg-[#F79C1D] text-white px-4 py-3 rounded-2xl";
            if (msg.msgType === 'redpacket') return userBase + "bg-[#EA5F39] text-white px-4 py-3 rounded-2xl";
            return userBase + "bg-[#5B7FFF] text-white px-4 py-2.5 rounded-2xl";
        } else if (msg.role === 'system') {
            return "";
        } else {
            // Assistant
            if (msg.msgType === 'sticker') return base + "bg-transparent p-0";
            const aiBase = base + "bubble-ai-tail ";
            if (msg.msgType === 'image') return aiBase + "bg-white p-1 rounded-2xl";
            if (msg.msgType === 'gift') return aiBase + "bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white px-4 py-3 rounded-2xl border-2 border-pink-100 dark:border-pink-900/30";
            if (msg.msgType === 'transfer') return aiBase + "bg-[#F79C1D] text-white px-4 py-3 rounded-2xl";
            if (msg.msgType === 'redpacket') return aiBase + "bg-[#EA5F39] text-white px-4 py-3 rounded-2xl";
            return aiBase + "bg-white dark:bg-[#2C2C2E] text-gray-900 dark:text-white px-4 py-2.5 rounded-2xl";
        }
    };

    // --- Settings Actions ---
    const updateHistoryLimit = async (limit) => {
        setHistoryLimit(limit);
        await db.conversations.update(conversationId, { historyLimit: limit });
        triggerHaptic();
    };

    const updateReplyCount = async (count) => {
        setReplyCount(count);
        await db.conversations.update(conversationId, { replyCount: count });
        triggerHaptic();
    };

    // --- Message Actions ---
    const handleCopy = (content) => { navigator.clipboard.writeText(content); setSelectedMsg(null); };
    const handleDelete = async (msgId) => { await db.messengerMessages.delete(msgId); setSelectedMsg(null); };
    const handleRegenerate = async (msgId) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg || msg.role !== 'assistant') return;

        setSelectedMsg(null);
        await db.messengerMessages.update(msgId, { content: '...' });
        setIsTyping(true);

        const lastUserMsg = await db.messengerMessages
            .where('[conversationType+conversationId]')
            .equals(['single', conversationId])
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

    // --- Render ---
    const headerContent = (
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onProfile(characterId)}>
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#2C2C2E] overflow-hidden">
                {character?.avatar ? <img src={character.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={16} /></div>}
            </div>
            <span className="font-semibold text-[16px] text-gray-900 dark:text-white">{character?.name || 'Loading'}</span>
            <ChevronRight size={14} className="text-gray-400" />
        </div>
    );

    const rightButton = (
        <button onClick={() => setShowMenu(true)} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-[#2C2C2E]">
            <MoreHorizontal size={20} className="text-gray-900 dark:text-white" />
        </button>
    );

    return (
        <IOSPage title={headerContent} onBack={onBack} rightButton={rightButton}>
            <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#0A0A0A]">
                <style>{`
                    .bubble-user-tail {
                        border-bottom-right-radius: 4px !important;
                    }
                    .bubble-user-tail::after {
                        content: '';
                        position: absolute;
                        right: -5px;
                        bottom: 0px;
                        width: 10px;
                        height: 10px;
                        background: inherit;
                        clip-path: polygon(0 0, 0% 100%, 100% 100%);
                    }
                    .bubble-ai-tail {
                        border-bottom-left-radius: 4px !important;
                    }
                    .bubble-ai-tail::after {
                        content: '';
                        position: absolute;
                        left: -5px;
                        bottom: 0px;
                        width: 10px;
                        height: 10px;
                        background: inherit;
                        clip-path: polygon(100% 0, 100% 100%, 0 100%);
                    }
                `}</style>

                {/* Custom CSS Injection */}
                {customGlobalCss && <style>{customGlobalCss}</style>}
                {customBubbleCss && <style>{customBubbleCss}</style>}

                {/* Messages List */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" onClick={() => { setSelectedMsg(null); setShowMenu(false); }}>
                    {messages?.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
                            {msg.role === 'system' ? (
                                <span className="text-[12px] text-gray-400 py-1 px-3 bg-gray-100 dark:bg-[#1C1C1E] rounded-full max-w-[85%] text-center">{msg.content}</span>
                            ) : (
                                <div
                                    onContextMenu={(e) => { e.preventDefault(); triggerHaptic(); setSelectedMsg(msg.id); }}
                                    onClick={(e) => { e.stopPropagation(); setSelectedMsg(selectedMsg === msg.id ? null : msg.id); }}
                                    className={getBubbleStyle(msg)}
                                >
                                    {renderBubbleContent(msg)}

                                    {/* Context Menu */}
                                    <AnimatePresence>
                                        {selectedMsg === msg.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                                className={`absolute z-10 bottom-[calc(100%+8px)] ${msg.role === 'user' ? 'right-0' : 'left-0'} bg-black/80 backdrop-blur-md rounded-xl p-1.5 flex gap-1 shadow-xl`}
                                            >
                                                {msg.msgType === 'text' && <MenuBtn icon={Copy} label="复制" onClick={() => handleCopy(msg.content)} />}
                                                <MenuBtn icon={Trash2} label="删除" onClick={() => handleDelete(msg.id)} danger />
                                                {msg.role === 'assistant' && <MenuBtn icon={RotateCcw} label="重试" onClick={() => handleRegenerate(msg.id)} />}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && <div className="text-gray-400 text-sm ml-4 animate-pulse">对方正在输入...</div>}
                </div>

                {/* Input Area */}
                <div className="shrink-0 bg-[#F2F2F7] dark:bg-[#1C1C1E] backdrop-blur-xl border-t border-gray-200/50 dark:border-white/5 pb-[var(--sab)]">
                    <div className="flex items-end gap-3 px-3 py-2">
                        <button
                            onClick={() => { setShowExtras(!showExtras); triggerHaptic(); }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showExtras ? 'bg-gray-200 dark:bg-[#2C2C2E]' : ''}`}
                        >
                            <PlusCircle size={24} className="text-gray-500" />
                        </button>
                        <div className="flex-1 bg-white dark:bg-[#2C2C2E] rounded-2xl px-4 py-2 min-h-[40px] flex items-center shadow-sm">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="发消息..."
                                rows={1}
                                onKeyDown={handleKeyDown}
                                className="flex-1 bg-transparent text-[16px] dark:text-white resize-none max-h-32 focus:outline-none"
                            />
                        </div>

                        {/* Unified Send Button */}
                        <button
                            onClick={handleSendBtnClick}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform ${input.trim() ? 'bg-[#5B7FFF]' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                            <Send size={18} className="text-white" />
                        </button>
                    </div>

                    {/* Extras Panel */}
                    <AnimatePresence>
                        {showExtras && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-[#F2F2F7] dark:bg-black">
                                <div className="grid grid-cols-4 gap-y-6 gap-x-4 p-6 pb-8">
                                    <ExtraBtn icon={ImageIcon} label="图片" onClick={() => setActionModal({ type: 'image', label: '发送图片' })} />
                                    <ExtraBtn icon={Smile} label="表情" onClick={() => setActionModal({ type: 'sticker_manager', label: '表情包' })} color="text-yellow-500" bg="bg-yellow-100 dark:bg-yellow-900/20" />
                                    <ExtraBtn icon={Gift} label="礼物" onClick={() => setActionModal({ type: 'gift', label: '送礼物' })} color="text-pink-500" bg="bg-pink-100 dark:bg-pink-900/20" />
                                    <ExtraBtn icon={Wallet} label="转账" onClick={() => setActionModal({ type: 'transfer', label: '转账' })} color="text-amber-500" bg="bg-amber-100 dark:bg-amber-900/20" />
                                    <ExtraBtn icon={MoreHorizontal} label="红包" onClick={() => setActionModal({ type: 'redpacket', label: '发红包' })} color="text-red-500" bg="bg-red-100 dark:bg-red-900/20" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                initialHistory={historyLimit}
                initialReply={replyCount}
                initialNoPunc={noPunctuation}
                onSave={async (newSettings) => {
                    const { history, reply, noPunc } = newSettings;
                    setHistoryLimit(history);
                    setReplyCount(reply);
                    setNoPunctuation(noPunc);
                    await db.conversations.update(conversationId, {
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
        </IOSPage>
    );
};

// --- Sub Components ---

const SettingsDrawer = ({ isOpen, onClose, initialHistory, initialReply, initialNoPunc, onSave, onProfile, onClearHistory, onEstimateTokens }) => {
    // Local Pending State (Use strings for better input control)
    const [historyStr, setHistoryStr] = useState('');
    const [replyMinStr, setReplyMinStr] = useState('2');
    const [replyMaxStr, setReplyMaxStr] = useState('8');
    const [noPunctuation, setNoPunctuation] = useState(false);
    const [tokens, setTokens] = useState(0);

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
                        className="relative w-[320px] h-full bg-[#FAFAFA] dark:bg-[#1C1C1E] shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="shrink-0 h-[var(--sat)] bg-white/50 dark:bg-black/20" />
                        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200/50 dark:border-white/5">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">聊天设置</h2>
                            <button onClick={onClose} className="p-1 rounded-full bg-gray-200 dark:bg-gray-700">
                                <X size={16} className="text-gray-500 dark:text-gray-300" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {/* Token Counter */}
                            <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-semibold text-gray-500">预计消耗 (Preview)</span>
                                    <span className={`text-base font-bold font-mono ${tokens > 50000 ? 'text-red-500' : 'text-[#5B7FFF]'}`}>
                                        {tokens} Tokens
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-black h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${tokens > 50000 ? 'bg-red-500' : 'bg-[#5B7FFF]'}`} style={{ width: `${Math.min((tokens / 50000) * 100, 100)}%` }} />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 text-right">Limit: 50k</p>
                            </div>

                            {/* Section: Logic */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">逻辑控制</h3>

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
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">其他操作</h3>
                                <MenuItem icon={User} label="查看角色资料" onClick={onProfile} />
                                <MenuItem icon={Trash2} label="清空聊天记录" danger onClick={onClearHistory} />
                            </div>

                            <div className="h-6" />
                        </div>

                        {/* Save Button */}
                        <div className="p-5 border-t border-gray-200/50 dark:border-white/5 bg-[#FAFAFA] dark:bg-[#1C1C1E]">
                            <button
                                onClick={handleSave}
                                className="w-full py-4 bg-[#5B7FFF] active:scale-95 transition-all text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20"
                            >
                                保存配置
                            </button>
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

const ExtraBtn = ({ icon: Icon, label, onClick, color = 'text-gray-600', bg = 'bg-white dark:bg-[#2C2C2E]' }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
        <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center shadow-sm`}>
            <Icon size={24} className={color} />
        </div>
        <span className="text-[12px] text-gray-500">{label}</span>
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
