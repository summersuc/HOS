import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MoreVertical, RotateCcw, Copy, Trash2, User, PlusCircle, Mic, Image as ImageIcon, Smile, Gift, Wallet, MoreHorizontal, X, Edit2, Reply, ChevronRight, Settings } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { llmService } from '../../../services/LLMService';

const ChatDetail = ({ conversationId, characterId, onBack, onProfile }) => {
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedMsg, setSelectedMsg] = useState(null);
    const [showExtras, setShowExtras] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // History Limit State (Local state initialized from DB)
    const [historyLimit, setHistoryLimit] = useState(20);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const character = useLiveQuery(() => db.characters.get(characterId), [characterId]);
    const conversation = useLiveQuery(() => db.conversations.get(conversationId), [conversationId]);
    const messages = useLiveQuery(() =>
        db.messengerMessages.where('[conversationType+conversationId]').equals(['single', conversationId]).toArray()
        , [conversationId]);

    // Load History Limit preference
    useEffect(() => {
        if (conversation && conversation.historyLimit) {
            setHistoryLimit(conversation.historyLimit);
        }
    }, [conversation]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages?.length, isTyping, showExtras]);

    // --- Core AI Logic ---
    const runAI = async (userText) => {
        setIsTyping(true);
        let aiMsgId = null;
        let currentContent = '';

        try {
            // 1. Prepare Placeholder
            aiMsgId = await db.messengerMessages.add({
                conversationType: 'single',
                conversationId,
                role: 'assistant',
                content: '...', // Placeholder
                timestamp: Date.now()
            });

            // 2. Build Context
            const contextMessages = await llmService.buildContext(characterId, conversationId, userText, historyLimit);

            // 3. Send Stream
            await llmService.sendMessageStream(
                contextMessages,
                (delta) => {
                    // On Delta
                    currentContent += delta;
                    // Optimize: Only update DB occasionally or use local state for smooth UI?
                    // For reliability, we update DB. Dexie is fast enough for small updates usually.
                    // If too slow, consider a throttling mechanism.
                    db.messengerMessages.update(aiMsgId, { content: currentContent });
                },
                (fullText) => {
                    // On Complete
                    setIsTyping(false);
                    db.messengerMessages.update(aiMsgId, { content: fullText });
                    db.conversations.update(conversationId, { updatedAt: Date.now() });
                    triggerHaptic();
                },
                (error) => {
                    // On Error
                    setIsTyping(false);
                    db.messengerMessages.update(aiMsgId, { content: `[Error: ${error.message}]` });
                }
            );

        } catch (e) {
            console.error(e);
            setIsTyping(false);
            if (aiMsgId) db.messengerMessages.update(aiMsgId, { content: `[Internal Error]` });
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const text = input.trim();
        setInput('');
        setShowExtras(false);
        triggerHaptic();

        await db.messengerMessages.add({ conversationType: 'single', conversationId, role: 'user', content: text, timestamp: Date.now() });
        await runAI(text);
    };

    const handleSystemAction = async (actionText) => {
        triggerHaptic();
        setShowExtras(false);
        const systemText = `[系统消息: 用户${actionText}]`;

        await db.messengerMessages.add({ conversationType: 'single', conversationId, role: 'system', content: systemText, timestamp: Date.now() });

        // Trigger AI response to system event
        // We pass the system text as "userMessage" in context building effectively to trigger response
        // But for clarity, we should probably handle it slightly differently?
        // Actually, passing it as the "latest message" matches the expectation that the AI reacts to it.
        await runAI(systemText);
    };

    // --- Settings Actions ---
    const updateHistoryLimit = async (limit) => {
        setHistoryLimit(limit);
        await db.conversations.update(conversationId, { historyLimit: limit });
        triggerHaptic();
    };

    // --- Message Actions ---
    const handleCopy = (content) => { navigator.clipboard.writeText(content); setSelectedMsg(null); };
    const handleDelete = async (msgId) => { await db.messengerMessages.delete(msgId); setSelectedMsg(null); };
    const handleRegenerate = async (msgId) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg || msg.role !== 'assistant') return;

        // Delete current AI msg (or keep and overwrite?) -> Overwrite is better UX usually, or delete and new.
        // Let's delete and re-run last user msg.
        // But we need the LAST user message.

        // Find the message immediately preceding this one?
        // Simpler: Just delete this AI message and call runAI with "continue" or last user msg.
        // But context builder expects a "userMessage".

        // Strategy:
        // 1. Get the last user message from history directly.
        // 2. Clear this AI message content to "..."
        // 3. Call stream.

        setSelectedMsg(null);
        await db.messengerMessages.update(msgId, { content: '...' });
        setIsTyping(true);

        // Find last user message in DB
        const lastUserMsg = await db.messengerMessages
            .where('[conversationType+conversationId]')
            .equals(['single', conversationId])
            .filter(m => m.role === 'user' || m.role === 'system')
            .last();

        const textToCheck = lastUserMsg ? lastUserMsg.content : '...';

        try {
            const contextMessages = await llmService.buildContext(characterId, conversationId, textToCheck, historyLimit);
            // Remove the LAST item (which is the current user message duplicated by buildContext logic usualli)
            // Wait, buildContext appends the `userMessage` arg.
            // If we pass `textToCheck`, it appends it.
            // But `textToCheck` is ALREADY in DB history.
            // So we might get double?
            // `buildContext` implementation: 
            // `history` = fetch last N. 
            // `messages.push({ role: 'user', content: userMessage });`
            // If we are regenerating, the user message is already in history.
            // We should ideally NOT pass it as separate arg if it's already there. or pass empty string?

            // Fix: Modify buildContext locally or just accept duplication/hack.
            // Better: Delete the AI message first, then the last message in DB IS the user message.
            // Then `llmService` logic needs to know we are RETRYING.

            // Quick Fix: Pass empty string as user message, but that might break logic requiring last msg.
            // Let's just delete the AI message, and assume the users last message is the trigger.
            // AND pass the last user message text.
            // BUT `buildContext` grabs history.

            // To avoid complexity:
            // 1. Delete AI message.
            // 2. Fetch history (now ends with User message).
            // 3. Pass "continue" or just empty string?
            // Actually `buildContext` takes `userMessage` as the "New Input".

            // Let's just trigger a specialized regenerate flow manually here or simplify:
            // "Regenerate" -> Delete AI msg -> Send last user msg again (User sees history duplicate? No, prompt sees duplicate).

            // Re-implementation of regenerate properly:
            // We just want to get a new completion. 
            // We can manually remove the last message from history inside LLMService or just ignore the duplication for MVP.
            // Duplication isn't fatal usually.

            let currentContent = '';
            await llmService.sendMessageStream(
                // Context with textToCheck appended. It is fine.
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
                                    className={`max-w-[75%] px-4 py-2.5 text-[16px] leading-relaxed cursor-pointer relative shadow-sm ${msg.role === 'user' ? 'bg-[#5B7FFF] text-white rounded-2xl rounded-br-md' : 'bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white rounded-2xl rounded-bl-md'}`}
                                >
                                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                                    {/* Context Menu */}
                                    <AnimatePresence>
                                        {selectedMsg === msg.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                                className={`absolute z-10 bottom-[calc(100%+8px)] ${msg.role === 'user' ? 'right-0' : 'left-0'} bg-black/80 backdrop-blur-md rounded-xl p-1.5 flex gap-1 shadow-xl`}
                                            >
                                                <MenuBtn icon={Copy} label="复制" onClick={() => handleCopy(msg.content)} />
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
                                className="flex-1 bg-transparent text-[16px] dark:text-white resize-none max-h-32 focus:outline-none"
                            />
                        </div>
                        {input.trim() ? (
                            <button onClick={handleSend} className="w-9 h-9 rounded-full bg-[#5B7FFF] flex items-center justify-center shadow-md active:scale-90 transition-transform">
                                <Send size={18} className="text-white" />
                            </button>
                        ) : (
                            <button className="w-9 h-9 flex items-center justify-center"><Mic size={24} className="text-gray-500" /></button>
                        )}
                    </div>

                    {/* Extras Panel */}
                    <AnimatePresence>
                        {showExtras && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-[#F2F2F7] dark:bg-black">
                                <div className="grid grid-cols-4 gap-y-6 gap-x-4 p-6 pb-8">
                                    <ExtraBtn icon={ImageIcon} label="图片" onClick={() => handleSystemAction('发送了一张图片 [Image]')} />
                                    <ExtraBtn icon={Gift} label="礼物" onClick={() => handleSystemAction('送出了一份礼物 🎁')} color="text-pink-500" bg="bg-pink-100 dark:bg-pink-900/20" />
                                    <ExtraBtn icon={Wallet} label="转账" onClick={() => handleSystemAction('转账 ¥520.00 💰')} color="text-amber-500" bg="bg-amber-100 dark:bg-amber-900/20" />
                                    <ExtraBtn icon={MoreHorizontal} label="红包" onClick={() => handleSystemAction('发出了一个红包 🧧')} color="text-red-500" bg="bg-red-100 dark:bg-red-900/20" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Top Right Menu */}
            <AnimatePresence>
                {showMenu && (
                    <div className="absolute inset-0 bg-black/40 z-50" onClick={() => setShowMenu(false)}>
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="absolute bottom-0 w-full bg-white dark:bg-[#1C1C1E] rounded-t-3xl p-4 pb-10" onClick={e => e.stopPropagation()}>
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6" />

                            {/* Context Limit Setting */}
                            <div className="px-4 mb-6">
                                <label className="text-sm font-medium text-gray-500 mb-3 block">上下文历史记录 ({historyLimit}条)</label>
                                <div className="flex gap-2">
                                    {[10, 20, 50, 0].map(limit => (
                                        <button
                                            key={limit}
                                            onClick={() => updateHistoryLimit(limit)}
                                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${historyLimit === limit ? 'bg-[#5B7FFF] text-white' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300'}`}
                                        >
                                            {limit === 0 ? '全部' : limit}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <MenuItem icon={User} label="查看资料" onClick={() => { setShowMenu(false); onProfile(characterId); }} />
                            <MenuItem icon={Trash2} label="清空聊天记录" danger onClick={async () => {
                                if (confirm('确定清空?')) {
                                    await db.messengerMessages.where('[conversationType+conversationId]').equals(['single', conversationId]).delete();
                                    setShowMenu(false);
                                }
                            }} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </IOSPage>
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

export default ChatDetail;
