import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import Avatar from '../components/Avatar';
import { motion, AnimatePresence, useMotionValue, useAnimation, useDragControls } from 'framer-motion';
import { MoreVertical, User, X, Settings, MessageCircle, Square, CheckSquare } from 'lucide-react';
import { ChevronRight, Heart, MoreHorizontal, PlusCircle, Smile, Send, Mic, Image as ImageIcon, Reply, Edit2, Copy, RotateCcw, Trash2, Gift, Wallet, ArrowRightLeft, Music, Sparkles, Bug, FolderPlus, Upload, Check, Plus, RedPacket, Play } from '../icons';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import { triggerHaptic } from '../../../utils/haptics';
import { storageService } from '../../../services/StorageService';
// IOSPage removed for custom animation
import { llmService } from '../../../services/LLMService';
import NotificationService from '../../../services/NotificationService';
import { appRegistry } from '../../../config/appRegistry';
import TranslationBubble from '../components/TranslationBubble';
// import { useToast } from '../../../components/common/Toast'; // Replaced by AlertModal
import AlertModal from '../../../components/common/AlertModal';
import BilingualSmartBubble from '../components/BilingualSmartBubble';
import MusicPickerModal from '../components/MusicPickerModal';
import ListenTogetherPlayer from '../components/ListenTogetherPlayer';
import { useAudio } from '../../../hooks/useAudio';
import { useListenTogether } from '../../../hooks/useListenTogether';
import { MusicService } from '../../../services/MusicService';
import DebugLogModal from '../components/DebugLogModal';
import VoiceBubble from '../components/VoiceBubble';

const ChatDetail = ({ conversationId, characterId, onBack, onProfile, onSettings, initialAttachment }) => {
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedMsg, setSelectedMsg] = useState(null);
    const [panelMode, setPanelMode] = useState('none'); // 'none', 'extras', 'stickers'
    const [showMenu, setShowMenu] = useState(false);
    const [replyTo, setReplyTo] = useState(null); // { id, content, name }
    const [pendingAttachment, setPendingAttachment] = useState(null); // { type, data }
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    const [showMiniPlayer, setShowMiniPlayer] = useState(false); // Controls ListenTogetherPlayer visibility
    const { playNextTrack, playTrack, currentTrack } = useAudio();
    const { isEnabled: isListenTogether, set: setListenTogether } = useListenTogether();
    const lastTrackRef = useRef(null);
    const listeningHistory = useRef([]); // Store songs listened to while silent

    // Debug State
    const [debugRequest, setDebugRequest] = useState('');
    const [debugResponse, setDebugResponse] = useState('');
    const [showDebugLog, setShowDebugLog] = useState(false);

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

    // API Error Modal State
    const [apiError, setApiError] = useState(null); // { title: string, content: string }

    // Toast (Removed for API errors, kept if needed for others, but unused now)
    // const { showToast, ToastComponent } = useToast();

    // Settings State
    const [historyLimit, setHistoryLimit] = useState(20);
    const [replyCount, setReplyCount] = useState("2-8"); // Default 2-8 range
    const [noPunctuation, setNoPunctuation] = useState(false); // New state
    const [avatarMode, setAvatarMode] = useState('none');
    const [headerStyle, setHeaderStyle] = useState('standard');
    const [maxTokens, setMaxTokens] = useState(5000); // Output length limit
    const [translationMode, setTranslationMode] = useState({ enabled: false, showOriginal: true, style: 'merged', interaction: 'always' });
    const [estTokens, setEstTokens] = useState(0);

    // Custom CSS Injection
    const [customGlobalCss, setCustomGlobalCss] = useState('');
    const [customBubbleCss, setCustomBubbleCss] = useState('');

    const scrollRef = useRef(null);
    const bottomRef = useRef(null); // New Anchor
    const inputRef = useRef(null);

    const character = useLiveQuery(() => db.characters.get(characterId), [characterId]);
    const conversation = useLiveQuery(() => db.conversations.get(safeCid), [safeCid]);

    // Force re-render when storage cache updates (for wallpaper changes)
    const [storageVersion, setStorageVersion] = useState(0);
    useEffect(() => {
        return storageService.subscribe(() => setStorageVersion(v => v + 1));
    }, []);

    // Handle External Share (Listen Together)
    useEffect(() => {
        if (initialAttachment) {
            setPendingAttachment(initialAttachment);
            // Optionally focus input or trigger other UI states
            setPanelMode('none');
        }
    }, [initialAttachment]);

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
            // [Fix Unread Badge Logic] Clear unread count on enter/update
            if (conversation.id) {
                // Determine if we need to update. Current time > lastReadAt usually.
                // We just force update lastReadAt to now.
                db.conversations.update(conversation.id, { lastReadAt: Date.now() });
            }

            if (conversation.historyLimit !== undefined) setHistoryLimit(conversation.historyLimit);
            if (conversation.replyCount !== undefined) setReplyCount(conversation.replyCount);
            if (conversation.noPunctuation !== undefined) setNoPunctuation(conversation.noPunctuation);
            if (conversation.avatarMode) setAvatarMode(conversation.avatarMode);
            if (conversation.headerStyle) setHeaderStyle(conversation.headerStyle);
            if (conversation.maxTokens !== undefined) setMaxTokens(conversation.maxTokens);
            if (conversation.translationMode) setTranslationMode({ ...translationMode, ...conversation.translationMode });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation?.id, conversation?.historyLimit, conversation?.replyCount, conversation?.noPunctuation, conversation?.avatarMode, conversation?.headerStyle, JSON.stringify(conversation?.translationMode), conversation?.maxTokens]); // Track all settings for real-time update

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

    // --- Scroll & Read Status Logic ---
    // --- Scroll & Read Status Logic ---
    // 1. Auto-Scroll to Bottom (Robust Multi-stage)
    // Stage 1: Instant scroll before paint
    useLayoutEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages?.length, isTyping, panelMode, translationMode]);

    // Stage 2: Delayed scroll to catch layout shifts (images, mobile keyboard)
    useEffect(() => {
        const t1 = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);

        // Stage 3: Extra safeguard for heavy DOM updates
        const t2 = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 300);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [messages?.length, panelMode]);

    useEffect(() => {
        if (conversation?.id && messages?.length > 0) {
            // Update lastReadAt whenever messages update to ensure it stays current
            db.conversations.update(conversation.id, { lastReadAt: Date.now() });
        }
    }, [conversation?.id, messages?.length]);

    // --- Background Music Listener (Listen Together) ---
    useEffect(() => {
        if (!isListenTogether || !currentTrack || !conversationId) return;

        // Check if track changed
        if (lastTrackRef.current === currentTrack.id) return;

        // Skip on initial mount if we don't want to trigger immediately, 
        // BUT if we just turned on mode, maybe we SHOULD trigger?
        // Let's safe guard: strictly trigger on CHANGE from a known previous state, 
        // or if we just enabled mode and music is playing? 
        // Simpler: Just check string diff.

        const isNewTrack = lastTrackRef.current !== currentTrack.id;
        lastTrackRef.current = currentTrack.id;

        if (isNewTrack) {
            // Passive Record: Don't trigger AI, just store in history
            const songName = `${currentTrack.name} - ${currentTrack.ar?.[0]?.name || 'Unknown'}`;
            console.log('[ListenTogether] History Added:', songName);

            // Check duplicates to avoid spamming the same song if effect re-runs
            if (listeningHistory.current[listeningHistory.current.length - 1] !== songName) {
                listeningHistory.current.push(songName);
            }
        }
    }, [currentTrack?.id, isListenTogether, conversationId]);

    // --- Core AI Logic (Refactored for Splitting) ---
    const runAI = async (userText) => {
        setIsTyping(true);
        setDebugRequest('');
        setDebugResponse('');
        const thisReqId = Date.now(); // Simple tracking
        let buffer = '';

        const pendingQueue = []; // Queue of { type: 'text'|'sticker', content: string }
        let processingQueue = false;

        // ... (Queue processing logic remains same, skipping for brevity in search replacement if possible, but replace_file_content needs contig)
        // I will target the specific logging block


        const processQueue = async () => {
            if (processingQueue) return;
            processingQueue = true;

            try {
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
            } catch (err) {
                console.error('Queue Processing Error:', err);
            } finally {
                processingQueue = false;
            }
        };

        const addToQueue = (item) => {
            pendingQueue.push(item);
            processQueue();
        };

        // Helper to process a single logical line (Text + Translation + Commands)
        const processLine = (lineStr) => {
            // 1. Check for '|||' separation globally first
            let contentPart = lineStr;
            let translationPart = null;

            const sepIdx = lineStr.indexOf('|||');
            if (sepIdx !== -1) {
                contentPart = lineStr.substring(0, sepIdx).trim();
                translationPart = lineStr.substring(sepIdx + 3).trim();
            }

            if (!contentPart) return;

            // 2. Check contentPart for Command
            const CMD_REGEX = /\[\s*(Sticker|RedPacket|Transfer|Gift|Image|图片|Voice|语音|Music|(?:Context:\s*)?User\s+sent\s+Voice\s+Message)[:：]\s*(.*?)\]/i;
            const match = contentPart.match(CMD_REGEX);

            if (match) {
                // It's a command
                const typeStr = match[1].toLowerCase();
                let argsStr = match[2].trim();
                let msgType = 'text';
                let finalContent = contentPart; // Default to full part
                let metadata = {};

                // If translationPart is still null, check inside args (e.g. AI put it inside brackets)
                if (!translationPart && argsStr.includes('|||')) {
                    const parts = argsStr.split('|||');
                    argsStr = parts[0].trim();
                    translationPart = parts[1].trim();
                }

                // Clean up translation part if it's also wrapped in a command (Recursive Fix)
                if (translationPart) {
                    // Strip all [Sticker: ...], [Voice: ...], etc tags from translation
                    // We can use a global replacement to remove everything inside brackets that looks like a command
                    const cleanTransRegex = /\[\s*(Sticker|RedPacket|Transfer|Gift|Image|图片|Voice|语音|Music|(?:Context:\s*)?User\s+sent\s+Voice\s+Message)[:：]\s*(.*?)\s*\]/gi;
                    translationPart = translationPart.replace(cleanTransRegex, (match, p1, p2) => p2.trim()).trim();
                }

                if (typeStr === 'sticker') {
                    msgType = 'sticker';
                    finalContent = `[Sticker: ${argsStr}]`;
                    metadata = { stickerUrl: '' };
                } else if (typeStr === 'redpacket') {
                    msgType = 'redpacket';
                    const args = argsStr.split(/,|，/).map(s => s.trim());
                    metadata = { amount: args[0], note: args[1] || '恭喜发财' };
                    finalContent = `红包: ${metadata.amount}`;
                } else if (typeStr === 'transfer') {
                    msgType = 'transfer';
                    const args = argsStr.split(/,|，/).map(s => s.trim());
                    metadata = { amount: args[0], note: args[1] || '转账' };
                    finalContent = `转账: ${metadata.amount}`;
                } else if (typeStr === 'gift') {
                    msgType = 'gift';
                    metadata = { giftName: argsStr };
                    finalContent = argsStr;
                } else if (typeStr === 'image' || typeStr === '图片') {
                    msgType = 'image';
                    metadata = { description: argsStr };
                    finalContent = argsStr;
                } else if (typeStr.includes('voice') || typeStr.includes('语音')) {
                    // Covers 'voice', 'user sent voice message', 'context: user sent voice message'
                    msgType = 'voice';

                    // Cleanup quotes if AI added them
                    argsStr = argsStr.replace(/^["']|["']$/g, '');

                    // Estimate duration
                    const duration = Math.min(60, Math.max(2, Math.ceil(argsStr.length * 0.3)));
                    metadata = { duration };

                    if (translationPart) {
                        finalContent = `${argsStr} ||| ${translationPart}`;
                    } else {
                        finalContent = argsStr;
                    }
                } else if (typeStr === 'music') {
                    // Handle Music Command
                    if (argsStr.toLowerCase() === 'next') {
                        playNextTrack();
                        return; // Side effect only
                    }
                    if (argsStr.toLowerCase().startsWith('play')) {
                        // Placeholder for play command
                        // finalContent = `[Music: ${argsStr}]`;
                    }
                }

                addToQueue({
                    type: msgType,
                    content: finalContent,
                    metadata: metadata
                });

            } else {
                // No Command -> Pure Text (or Text + Translation)
                let contentPart = lineStr;
                let translationPart = null;

                const sepIdx = lineStr.indexOf('|||');
                if (sepIdx !== -1) {
                    contentPart = lineStr.substring(0, sepIdx).trim();
                    translationPart = lineStr.substring(sepIdx + 3).trim();

                    // Also strip command tags from pure text translation
                    if (translationPart) {
                        const cleanTransRegex = /\[\s*(Sticker|RedPacket|Transfer|Gift|Image|图片|Voice|语音|Music|(?:Context:\s*)?User\s+sent\s+Voice\s+Message)[:：]\s*(.*?)\s*\]/gi;
                        translationPart = translationPart.replace(cleanTransRegex, (match, p1, p2) => p2.trim()).trim();
                    }
                }

                if (!contentPart) return;

                // Handle mixed content like "[Music: Next]" if regex failed or strictly text check
                if (contentPart.includes('[Music: Next]')) {
                    playNextTrack();
                    contentPart = contentPart.replace('[Music: Next]', '').trim();
                    if (!contentPart) return;
                }

                addToQueue({
                    type: 'text',
                    content: contentPart,
                    metadata: translationPart ? { translation: translationPart } : {}
                });
            }
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

            // Debug Log: Request Context
            setDebugRequest(JSON.stringify(contextMessages, null, 2));

            // 3. Send Stream
            await llmService.sendMessageStream(
                contextMessages,
                (delta) => {
                    setDebugResponse(prev => prev + delta);
                    buffer += delta;

                    // Support Multi-Line Parsing (Split by \n)
                    // We process all COMPLETE lines in the buffer
                    let newlineIdx;
                    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.substring(0, newlineIdx).trim();
                        buffer = buffer.substring(newlineIdx + 1);
                        if (line) processLine(line);
                    }
                },
                (fullText) => {
                    // Final Flush of remaining buffer
                    if (buffer.trim()) {
                        processLine(buffer.trim());
                    }
                    setIsTyping(false);
                    db.conversations.update(conversationId, { updatedAt: Date.now() });
                },
                (error) => {
                    setIsTyping(false);
                    console.error(error);
                    setApiError({ title: 'API报错', content: error.message || '未知错误' });
                },
                { max_tokens: maxTokens > 0 ? maxTokens : undefined }
            );

        } catch (e) {
            console.error(e);
            setIsTyping(false);
        }
    };

    // --- Sending Logic ---

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

            setPanelMode('none');
            triggerHaptic();

            // Re-trigger runAI. Since the last assistant messages are gone, 
            // the AI will generate a fresh response for the last user message.
            await runAI(null);
        } else {
            // If the last message is a user message with no AI response yet
            setPanelMode('none');
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
            setPanelMode('none');

            // Handle Music Attachment
            if (pendingAttachment?.type === 'music_card') {
                const data = pendingAttachment.data;
                const isPlaylist = data.type === 'playlist';
                setPendingAttachment(null);

                // Trigger Auto-Play
                handleAutoPlayMusic(data);

                // Construct Descriptive Content for AI
                let musicContent = isPlaylist
                    ? `[User invites you to Listen Together: Playlist "${data.title}" - ${data.trackCount} tracks]`
                    : `[User invites you to Listen Together: Song "${data.title}" by ${data.artist}]`;

                await db.messengerMessages.add({
                    conversationType: 'single',
                    conversationId: safeCid,
                    role: 'user',
                    content: musicContent,
                    msgType: 'music_card',
                    metadata: data,
                    timestamp: Date.now() - 100
                });
            }

            // Inject Listening History if exists
            let contentToSend = text;
            if (listeningHistory.current.length > 0) {
                // Determine if we should clear it or just append. Clear it.
                const historyStr = listeningHistory.current.join(' -> ');
                const historyNote = `\n[System Helper: While you were silent, user listened to: ${historyStr}. Currently playing: ${currentTrack?.name || 'Nothing'}]`;

                // Append as hidden context? Or visible? 
                // User said "System needs to record... package together and send". 
                // Let's make it a system message insert BEFORE user message so AI sees it as context.

                await db.messengerMessages.add({
                    conversationType: 'single',
                    conversationId: safeCid,
                    role: 'system',
                    content: `[History Summary: User listened to ${historyStr}]`,
                    msgType: 'event_music_history', // Hidden type
                    timestamp: Date.now() - 50
                });

                listeningHistory.current = []; // Reset
            }

            // Handle Quote
            if (replyTo) {
                contentToSend = `[Quote: ${replyTo.name} said "${replyTo.content}"]\n${contentToSend}`;
                setReplyTo(null);
            }

            // Handle special User Commands for testing (Voice)
            const voiceMatch = contentToSend.match(/^\[(Voice|语音)[:：]\s*(.*?)\]$/i);
            if (voiceMatch) {
                const voiceContent = voiceMatch[2];
                const duration = Math.min(60, Math.max(2, Math.ceil(voiceContent.length * 0.3)));

                await db.messengerMessages.add({
                    conversationType: 'single',
                    conversationId: safeCid,
                    role: 'user',
                    content: voiceContent,
                    msgType: 'voice',
                    metadata: { duration },
                    timestamp: Date.now()
                });
                await runAI(null); // Context builder will pick up the just-added msg from DB
                return;
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
            // Handle Music Attachment (if sending empty text but has attachment)
            if (pendingAttachment?.type === 'music_card') {
                const data = pendingAttachment.data;
                const isPlaylist = data.type === 'playlist';
                setPendingAttachment(null);

                // Trigger Auto-Play
                handleAutoPlayMusic(data);

                let musicContent = isPlaylist
                    ? `[User invites you to Listen Together: Playlist "${data.title}" - ${data.trackCount} tracks]`
                    : `[User invites you to Listen Together: Song "${data.title}" by ${data.artist}]`;

                await db.messengerMessages.add({
                    conversationType: 'single',
                    conversationId: safeCid,
                    role: 'user',
                    content: musicContent,
                    msgType: 'music_card',
                    metadata: data,
                    timestamp: Date.now()
                });
                await runAI(null);
                return;
            }

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
        setPanelMode('none');
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
        setPanelMode('none');
        triggerHaptic();

        // Should AI react? No, let the user continue typing as per request.
        // await runAI(null);
    };

    const handleMusicSelected = async (data) => {
        // data: { songId, title, artist, cover, type, trackCount }
        // Don't send immediately. Set as pending attachment.
        setPendingAttachment({ type: 'music_card', data });
        setShowMusicPicker(false);
        setPanelMode('none');
        triggerHaptic();

        // Focus input to encourage typing
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleAutoPlayMusic = async (data) => {
        const isPlaylist = data.type === 'playlist';

        // Auto-enable Listen Together UI
        setListenTogether(true);
        setShowMiniPlayer(true);

        try {
            if (isPlaylist) {
                // Fetch full playlist tracks
                const res = await MusicService.getPlaylistDetail(data.songId);
                const tracks = res.songs;
                if (tracks && tracks.length > 0) {
                    const first = tracks[0];
                    const urlRes = await MusicService.getSongUrl(first.id);
                    if (urlRes?.data?.[0]?.url) {
                        playTrack(first, urlRes.data[0].url, tracks);
                    }
                }
            } else {
                // Play single song
                const urlRes = await MusicService.getSongUrl(data.songId);
                if (urlRes?.data?.[0]?.url) {
                    const track = {
                        id: data.songId,
                        name: data.title,
                        ar: [{ name: data.artist }],
                        al: { picUrl: data.cover }
                    };
                    playTrack(track, urlRes.data[0].url, [track]);
                }
            }
        } catch (err) {
            console.error("[Listen Together] Auto-play failed:", err);
        }
    };

    const renderBubbleContent = (msg, index) => {
        // Translation Logic
        const translation = msg.metadata?.translation;
        const showTrans = translation && translationMode?.enabled;

        const renderMainContent = () => {
            // Only render text content if it's NOT a special type (like sticker)
            // 'sticker' type is handled in the switch below, but sometimes users/AI send text that *looks* like a sticker tag
            // but is classified as text.
            if (msg.msgType === 'sticker') return null; // Important: Don't render text for stickers

            if (!msg.msgType || msg.msgType === 'text' || msg.msgType === 'txt') {
                // Quote Logic
                const quoteMatch = msg.content.match(/^\[Quote:\s*(.*?)\s*said\s*"(.*?)"\]\n?([\s\S]*)/i);
                if (quoteMatch) {
                    const [_, author, quotedContent, actualText] = quoteMatch;
                    const isUser = msg.role === 'user';
                    return (
                        <div className="flex flex-col gap-2 min-w-[120px] max-w-full">
                            <div className="flex gap-2.5 py-0.5 select-none touch-none">
                                <div className={`w-[3px] rounded-full shrink-0 ${isUser ? 'bg-white/50' : 'bg-blue-500/70'}`} />
                                <div className="flex flex-col gap-0.5 overflow-hidden">
                                    <span className={`text-[11px] font-bold tracking-tight ${isUser ? 'text-white/90' : 'text-blue-500/90'}`}>{author}</span>
                                    <div className={`text-[13px] leading-snug line-clamp-1 italic opacity-80 ${isUser ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{quotedContent}</div>
                                </div>
                            </div>
                            <div className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed px-0.5 ${isUser ? 'text-white' : 'text-current'}`}>{actualText}</div>
                        </div>
                    );
                }
                return <div className="whitespace-pre-wrap break-words">{msg.content}</div>;
            }
            return null;
        };

        const mainContent = renderMainContent();

        if (mainContent === null) {
            // Handle Rich Media
            switch (msg.msgType) {
                case 'image': return <RichImageBubble content={msg.content} />;
                case 'gift':
                    return (
                        <div className="flex items-center gap-3 min-w-[220px] p-3 bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white rounded-2xl border-2 border-pink-100 dark:border-pink-900/30 shadow-sm">
                            <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center shrink-0"><Gift size={24} className="text-pink-500" /></div>
                            <div className="flex flex-col"><span className="text-sm font-semibold opacity-90">送出礼物</span><span className="text-base font-bold text-pink-500">{msg.metadata?.giftName || msg.content}</span></div>
                        </div>
                    );
                case 'transfer':
                    const amount = parseFloat(msg.metadata?.amount || '0').toFixed(2);
                    const targetName = msg.role === 'user' ? (character?.name || '朋友') : '你';
                    return (
                        <div className="flex flex-col min-w-[240px] p-4 bg-[#F79C1D] text-white rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><ArrowRightLeft size={20} className="text-white" /></div><div className="flex flex-col text-white"><span className="text-sm opacity-80">转账给{targetName}</span><span className="text-lg font-bold">¥{amount}</span></div></div>
                            <div className="border-t border-white/20 pt-1"><span className="text-xs text-white/50">{msg.metadata?.note || '微信转账'}</span></div>
                        </div>
                    );
                case 'redpacket':
                    return (
                        <div className="flex flex-col min-w-[240px] p-4 bg-[#EA5F39] text-white rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 bg-yellow-100/20 rounded-lg flex items-center justify-center"><Wallet size={20} className="text-yellow-200" /></div><div className="flex flex-col text-white"><span className="text-base font-bold truncate max-w-[140px]">{msg.metadata?.note || '恭喜发财'}</span><span className="text-xs opacity-80">查看红包</span></div></div>
                            <div className="border-t border-white/10 pt-1"><span className="text-xs text-white/50">微信红包</span></div>
                        </div>
                    );
                case 'sticker': return <StickerBubble stickerName={msg.content} />;
                case 'translation':
                    // Map legacy logic if needed, but msg.msgType==translation is usually standalone
                    return (
                        <TranslationBubble
                            content={msg.content}
                            mode={translationMode?.style || 'inside'}
                            isUser={false}
                        />
                    );
                case 'music_card':
                    return <MusicBubble
                        content={msg.content}
                        metadata={msg.metadata}
                        isUser={msg.role === 'user'}
                        onPlay={() => handleAutoPlayMusic(msg.metadata)}
                    />;
                case 'voice':
                    return <VoiceBubble
                        content={msg.content}
                        duration={msg.metadata?.duration}
                        isUser={msg.role === 'user'}
                        borderRadius={getBubbleCorners(msg, index, messages)}
                    />;
                default: return <div>{msg.content}</div>;
            }
        }

        return mainContent;
    };

    // Bubble Style Helpers (Union Logic)
    const getBubbleCorners = (msg, index, allMessages) => {
        const isUser = msg.role === 'user';
        const prevMsg = allMessages[index - 1];
        const nextMsg = allMessages[index + 1];

        // Union Checks
        const isFirst = !prevMsg || prevMsg.role !== msg.role;
        const isLast = !nextMsg || nextMsg.role !== msg.role;

        // Base classes
        let borderRadius = 'rounded-2xl'; // Default full round

        // Dynamic Corners for Union Effect
        if (!isFirst && !isLast) {
            borderRadius = isUser ? 'rounded-2xl rounded-r-sm' : 'rounded-2xl rounded-l-sm';
        } else if (isFirst && !isLast) {
            borderRadius = isUser ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm';
        } else if (!isFirst && isLast) {
            borderRadius = isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
        }
        return borderRadius;
    };

    const getBubbleStyle = (msg, index, allMessages, isTransparent = false) => {
        const isUser = msg.role === 'user';
        const borderRadius = getBubbleCorners(msg, index, allMessages);

        const base = `max-w-[68%] relative cursor-pointer text-[14px] leading-snug transition-all ${borderRadius} `;

        // Special Cards (Rich Media) -> No Padding/Color
        if (['sticker', 'image', 'gift', 'transfer', 'redpacket', 'music_card', 'voice'].includes(msg.msgType)) {
            return "max-w-[80%] relative cursor-pointer " + borderRadius;
        }

        // V3 Split Mode: Return only layout props if transparent
        if (isTransparent) {
            return base; // No bg, no shadow, no border. Just layout & shape.
        }

        // Standard Text Bubbles
        if (isUser) {
            // Gradient Blue for Light, specific Dark Grey for Dark
            return base + "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 dark:from-transparent dark:via-transparent dark:to-transparent dark:bg-[#3A3A3C] text-white dark:text-gray-200 px-3 py-2 shadow-lg shadow-blue-500/20 dark:shadow-none dark:border dark:border-white/10";
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

    const handleContextMenu = (e, msg) => {
        e.preventDefault();
        triggerHaptic();
        setSelectedMsg(msg.id);
    };

    // --- Render ---
    // V3 Header Content Logic
    // V3 Header Content Logic
    const displayName = character?.nickname || character?.name || 'Loading';

    const headerContent = useMemo(() => {
        if (headerStyle === 'name_only') {
            return (
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onProfile(characterId)}>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                        <span className="font-semibold text-[17px] text-gray-900 dark:text-white tracking-tight">
                            {displayName}
                        </span>
                    </div>
                </div>
            );
        }

        if (headerStyle === 'immersive') {
            return (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => onProfile(characterId)}>
                    {/* AI Avatar */}
                    <Avatar
                        src={character ? (storageService.getCachedBlobUrl('characters', character.id) || character.avatar) : null}
                        name={character?.name}
                        size={36}
                        className="rounded-lg shadow-sm"
                    />

                    {/* Static Hollow Heart */}
                    <div className="w-6 flex justify-center text-white/90">
                        <Heart size={16} strokeWidth={2.5} />
                    </div>

                    {/* User Avatar */}
                    <Avatar
                        src={userPersona ? (storageService.getCachedBlobUrl('userPersonas', userPersona.id) || userPersona.avatar) : null}
                        name={userPersona?.userName || 'Me'}
                        size={36}
                        className="rounded-lg shadow-sm"
                    />
                </div>
            );
        }

        // Default 'standard'
        return (
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onProfile(characterId)}>
                <Avatar src={character ? (storageService.getCachedBlobUrl('characters', character.id) || character.avatar) : null} name={character?.name} size={32} className="rounded-lg" />
                <div className="flex flex-col items-start leading-none gap-0.5">
                    <span className="font-semibold text-[16px] text-gray-900 dark:text-white flex items-center gap-1.5">
                        {displayName}
                    </span>
                </div>
            </div>
        );
    }, [headerStyle, character, userPersona, displayName, onProfile, characterId]);

    const rightButton = (
        <div className="flex items-center gap-2">
            {isListenTogether && (
                <button
                    onClick={() => setShowMiniPlayer(!showMiniPlayer)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${showMiniPlayer ? 'bg-blue-500/10 dark:bg-blue-400/20' : 'active:bg-gray-100 dark:active:bg-[#2C2C2E]'}`}
                >
                    <Music size={20} className={showMiniPlayer ? "text-[#5B7FFF] dark:text-[#7FA9FF]" : "text-gray-900 dark:text-white"} />
                </button>
            )}
            <button onClick={() => onSettings(safeCid, characterId)} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-[#2C2C2E]">
                <MoreHorizontal size={20} className="text-gray-900 dark:text-white" />
            </button>
        </div>
    );

    // V1.2 Custom Animation Variants (Center Scale Up) + Swipe Logic
    const x = useMotionValue(0);
    const controls = useAnimation();
    const dragControls = useDragControls();

    const handleDragEnd = async (event, info) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        if (offset > 60 || velocity > 200) {
            await controls.start({ x: "100%", opacity: 0, scale: 0.9 });
            onBack();
        } else {
            controls.start({ x: 0, opacity: 1, scale: 1 });
        }
    };

    const pageVariants = {
        initial: { opacity: 0, scale: 0.95, filter: 'blur(10px)', x: 0 },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)', x: 0 }, // Ensure x is 0 on enter
        exit: { opacity: 0, scale: 0.95, filter: 'blur(10px)' }
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 z-20 flex flex-col bg-[#F2F2F7] dark:bg-black shadow-2xl overflow-hidden origin-center"
            style={{ x, willChange: "transform" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.6 }}
            onDragEnd={handleDragEnd}
            dragListener={false}
            dragControls={dragControls}
        >
            {/* Edge Swipe Hit Area */}
            <div
                className="absolute left-0 top-0 bottom-0 w-8 z-50 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: 'none' }}
            />
            <style>{`
                /* Hide scrollbar for cleaner look */
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
            `}</style>

            {/* Custom Header (Replicating IOSPage Header) */}
            {/* Custom Header (V3: Soft Gradient Blur) */}
            <div className="absolute top-0 left-0 right-0 z-30">
                {/* Background Layer - Masked Blur */}
                <div
                    className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)',
                        backdropFilter: 'blur(50px)',
                        WebkitBackdropFilter: 'blur(50px)',
                        maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)'
                    }}
                />

                {/* Content Layer */}
                <div className="relative h-[50px] flex items-center justify-between px-2 pt-[env(safe-area-inset-top)] box-content">
                    <button
                        onClick={onBack}
                        className="p-2 flex items-center gap-1 text-gray-400 dark:text-gray-400 active:opacity-50 transition-opacity"
                    >
                        <ChevronRight size={24} className="rotate-180" />
                    </button>

                    {/* Title */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex justify-center max-w-[60%] overflow-hidden">
                        {headerContent}
                    </div>

                    <div className="w-[70px] flex justify-end">
                        {rightButton}
                    </div>
                </div>
            </div>

            <div className="flex flex-col h-full relative">
                {/* Wallpaper Logic - z-index set higher to show above base */}
                <div className="absolute inset-0 z-[1] pointer-events-none">
                    {/* 1. Base Dark Texture (Default) - REMOVED (Moved to root) */}
                    {/* <div className="absolute inset-0 bg-[#F2F2F7] dark:bg-[#000000]"></div> */}
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

                {/* Listen Together Floating Player (Controlled) */}
                <ListenTogetherPlayer
                    visible={showMiniPlayer}
                    onClose={() => setShowMiniPlayer(false)}
                    conversationId={safeCid}
                />

                {/* Messages List */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 pt-[calc(50px+env(safe-area-inset-top)+1rem)] space-y-2 relative z-10" onClick={() => { setSelectedMsg(null); setShowMenu(false); }}>
                    {/* Debug / Empty State */}
                    {/* Debug / Empty State */}
                    {messages && messages.length === 0 && (
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

                        // Handle System, Revoked, or Hidden Event Messages
                        if (msg.role === 'system' || msg.msgType === 'revoked' || msg.msgType === 'event_music_change' || msg.msgType === 'event_music_history') {
                            if (msg.msgType === 'event_music_change' || msg.msgType === 'event_music_history') return null; // Completely hide music events from UI
                            return (
                                <div key={msg.id} className="flex flex-col gap-2 my-1.5">
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
                            <div
                                key={msg.id}
                                className="flex flex-col gap-1.5 relative"
                                style={{
                                    zIndex: selectedMsg === msg.id ? 50 : 'auto'
                                }}
                            >
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
                                        // Pass index and all messages for Union Logic
                                        // V3: Pass true for isTransparent if split mode
                                        className={`${getBubbleStyle(msg, index, messages, translationMode.style === 'split' && msg.metadata?.translation && translationMode.enabled)} ${isText ? (msg.role === 'user' ? 'bubble-user-shadow' : 'bubble-ai-shadow') : ''}`}
                                        style={
                                            // Dynamic Background Image Check
                                            isText ? {} : { boxShadow: 'none', background: 'transparent' }
                                        }
                                    >
                                        <BilingualSmartBubble
                                            msg={msg}
                                            translationMode={{
                                                ...translationMode,
                                                enabled: translationMode.enabled && !['sticker', 'image', 'gift', 'transfer', 'redpacket', 'music_card', 'voice'].includes(msg.msgType)
                                            }}
                                            isUser={msg.role === 'user'}
                                            visualClass={getBubbleStyle(msg, index, messages, false)} // Always pass the FULL visual style to children
                                            onContextMenu={(e) => { e.preventDefault(); triggerHaptic(); setSelectedMsg(msg.id); }}
                                            onBubbleClick={(e) => { e.stopPropagation(); setSelectedMsg(selectedMsg === msg.id ? null : msg.id); }}
                                        >
                                            {renderBubbleContent(msg, index)}
                                        </BilingualSmartBubble>

                                        {/* Context Menu */}
                                        <AnimatePresence>
                                            {selectedMsg === msg.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: (index >= messages.length - 2) ? 5 : -5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className={`absolute z-[100] ${(index >= messages.length - 2) ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'} ${msg.role === 'user' ? 'right-0 origin-right' : 'left-0 origin-left'} flex flex-row items-center bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl p-[2px] gap-px whitespace-nowrap overflow-hidden`}
                                                    onClick={(e) => e.stopPropagation()}
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
                    <div ref={bottomRef} />
                </div>

                {/* Extras Panel Interaction Overlay */}
                {
                    panelMode !== 'none' && (
                        <div
                            className="fixed inset-0 z-40 bg-black/0"
                            onClick={() => setPanelMode('none')}
                        />
                    )
                }

                {/* Extras Panel (Floating Card Style) */}
                <AnimatePresence mode="wait">
                    {panelMode === 'extras' && (
                        <motion.div
                            key="extras"
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="absolute bottom-24 left-4 right-4 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-3xl rounded-[24px] shadow-2xl border border-black/5 dark:border-white/5 p-3 z-50 origin-bottom"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="grid grid-cols-4 gap-y-3 gap-x-1 p-3 pb-4">
                                <ExtraBtn icon={ImageIcon} label="图片" onClick={() => setActionModal({ type: 'image', label: '发送图片' })} />
                                <ExtraBtn icon={Mic} label="语音" onClick={() => setActionModal({ type: 'voice', label: '发送语音' })} />
                                <ExtraBtn icon={Gift} label="礼物" onClick={() => setActionModal({ type: 'gift', label: '送礼物' })} />
                                <ExtraBtn icon={Wallet} label="转账" onClick={() => setActionModal({ type: 'transfer', label: '转账' })} />
                                <ExtraBtn icon={RedPacket} label="红包" onClick={() => setActionModal({ type: 'redpacket', label: '发红包' })} />
                                <ExtraBtn icon={Music} label="音乐" onClick={() => setShowMusicPicker(true)} />
                                <ExtraBtn icon={Sparkles} label="重新生成" onClick={handleRegenerateLast} />
                                <ExtraBtn icon={Bug} label="Debug" onClick={() => setShowDebugLog(true)} />
                            </div>
                        </motion.div>
                    )}
                    {panelMode === 'stickers' && (
                        <StickerPanel
                            key="stickers"
                            onClose={() => setPanelMode('none')}
                            onSelect={(s) => handleStickerSelected(s)}
                            onBack={() => setPanelMode('extras')}
                        />
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

                {/* Attachment Preview (Music) */}
                <AnimatePresence>
                    {pendingAttachment && pendingAttachment.type === 'music_card' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mx-3 mb-2 p-2 bg-gradient-to-r from-red-50 to-pink-50 dark:from-[#2d1b1f] dark:to-[#2d1b24] backdrop-blur-xl rounded-2xl flex items-center justify-between border border-pink-100 dark:border-pink-900/30 relative z-40 shadow-sm"
                        >
                            <div className="flex items-center gap-3 overflow-hidden pr-2 flex-1 min-w-0">
                                <img src={pendingAttachment.data.cover} className="w-10 h-10 rounded-lg object-cover bg-gray-200" />
                                <div className="flex flex-col justify-center gap-0.5">
                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">
                                        Together • {pendingAttachment.data.type === 'playlist' ? 'Playlist' : 'Song'}
                                    </span>
                                    <span className="truncate text-gray-900 dark:text-gray-100 text-xs font-bold">{pendingAttachment.data.title}</span>
                                </div>
                            </div>
                            <button onClick={() => setPendingAttachment(null)} className="p-2 -mr-1 text-gray-400 hover:text-red-500 active:bg-gray-200/50 dark:active:bg-white/5 rounded-full shrink-0 transition-colors">
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
                            onClick={() => { setPanelMode(panelMode === 'extras' ? 'none' : 'extras'); triggerHaptic(); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 mb-0.5 ${panelMode === 'extras' ? 'bg-gray-200 dark:bg-[#3A3A3C] rotate-45' : 'hover:bg-gray-200 dark:hover:bg-[#3A3A3C]'}`}
                        >
                            <PlusCircle size={22} className="text-gray-500" />
                        </button>

                        <div className="flex-1 min-w-0 min-h-[40px] flex items-center py-1">
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

                        <button
                            onClick={() => { setPanelMode(panelMode === 'stickers' ? 'none' : 'stickers'); triggerHaptic(); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 mb-0.5 ${panelMode === 'stickers' ? 'bg-gray-200 dark:bg-[#3A3A3C] text-yellow-500' : 'hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-500'}`}
                        >
                            <Smile size={22} />
                        </button>

                        {/* Animated Send Button */}
                        <motion.button
                            onClick={handleSendBtnClick}
                            whileTap={{ scale: 0.9 }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all mb-0.5 ${input.trim() || pendingAttachment
                                ? 'bg-transparent cursor-pointer'
                                : 'bg-transparent cursor-not-allowed'
                                }`}
                        >
                            <Send size={24} className={input.trim() || pendingAttachment ? "text-[#5B7FFF] ml-0.5" : "text-gray-500 ml-0.5"} />
                        </motion.button>
                    </div>

                </div>
            </div >

            {/* Action Modal */}
            < AnimatePresence >
                {actionModal && (
                    <ActionModal
                        action={actionModal}
                        onClose={() => setActionModal(null)}
                        onSubmit={handleModalSubmit}
                        onStickerSelect={handleStickerSelected}
                    />
                )}
            </AnimatePresence >

            {/* Top Right Menu (Drawer Style) */}
            {/* Debug Log Modal */}
            <DebugLogModal
                isOpen={showDebugLog}
                onClose={() => setShowDebugLog(false)}
                request={debugRequest}
                response={debugResponse}
            />

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

            {/* API Error Alert Modal */}
            <AlertModal
                isOpen={!!apiError}
                title={apiError?.title}
                content={apiError?.content}
                onClose={() => setApiError(null)}
            />
            {/* Music Picker Modal */}
            <AnimatePresence>
                {showMusicPicker && (
                    <MusicPickerModal
                        onClose={() => setShowMusicPicker(false)}
                        onSelect={handleMusicSelected}
                        userId={firstPersona?.neteaseId || null} // Pass Netease ID from persona if available
                    />
                )}
            </AnimatePresence>

        </motion.div >
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

                                        {/* Pending Attachment Preview */}
                                        <AnimatePresence>
                                            {pendingAttachment && pendingAttachment.type === 'music_card' && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    className="mx-4 mb-2 overflow-hidden"
                                                >
                                                    <div className="relative flex items-center gap-3 p-3 bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl rounded-2xl shadow-lg border border-[#FF3B30]/20 ring-1 ring-[#FF3B30]/10">
                                                        {/* Blurred Glow */}
                                                        <div
                                                            className="absolute -left-4 -top-4 w-20 h-20 bg-[#FF3B30]/20 blur-2xl rounded-full pointer-events-none"
                                                        />

                                                        <img
                                                            src={pendingAttachment.data.cover}
                                                            className="relative w-12 h-12 rounded-lg object-cover shadow-sm bg-gray-100 dark:bg-black/20"
                                                        />
                                                        <div className="relative flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-[10px] font-bold text-white bg-[#FF3B30] px-1.5 py-px rounded-full shadow-sm shadow-red-500/20">
                                                                    待发送
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 font-medium">一起听邀请</span>
                                                            </div>
                                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                                                                {pendingAttachment.data.title}
                                                            </h4>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                                {pendingAttachment.data.artist}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => setPendingAttachment(null)}
                                                            className="relative p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors active:scale-90"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Voice Input Bubble */}
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
                                className="w-full py-4 bg-gray-100 dark:bg-[#2C2C2E] active:bg-gray-200 dark:active:bg-[#3A3A3C] transition-all text-gray-900 dark:text-white font-bold rounded-2xl shadow-sm"
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
    // If type is sticker_manager, render specialized UI (Now Inline, usually this block won't be hit via modal)
    // But keep it for fallback
    if (action.type === 'sticker_manager') {
        return null;
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
        } else if (action.type === 'voice') {
            data.content = field1;
            // Approx duration: 0.3s per char, min 2s, max 60s
            // Users want to simulate voice, so just mapping length to duration is fine
            const duration = Math.min(60, Math.max(2, Math.ceil(field1.length * 0.3)));
            data.metadata = { duration };
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
                    {action.type === 'voice' && (
                        <textarea
                            className="w-full h-32 bg-gray-100 dark:bg-[#2C2C2E] p-3 rounded-xl dark:text-white outline-none resize-none"
                            placeholder="输入语音内容..."
                            value={field1}
                            onChange={e => setField1(e.target.value)}
                            autoFocus
                        />
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

// --- Music Bubble ---
const MusicBubble = ({ content, metadata, isUser, onPlay }) => {
    const isPlaylist = metadata?.type === 'playlist';

    return (
        <div
            className={`relative w-[240px] overflow-hidden rounded-[24px] shadow-xl transition-all duration-300 group cursor-pointer active:scale-[0.98] hover:shadow-2xl ${isUser ? 'mr-0.5' : 'ml-0.5'}`}
            onClick={(e) => { e.stopPropagation(); onPlay?.(); }}
        >
            {/* Ambient Background & Blur */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-40 blur-2xl scale-125 transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url(${metadata?.cover})` }}
            />
            <div className={`absolute inset-0 ${isUser ? 'bg-black/10' : 'bg-white/40 dark:bg-black/40'}`} />

            {/* Main Content Container */}
            <div className={`relative flex flex-col h-full backdrop-blur-3xl border rounded-[24px] overflow-hidden ${isUser
                ? 'bg-white/85 dark:bg-[#1C1C1E]/80 border-white/40 dark:border-white/10'
                : 'bg-white/90 dark:bg-[#1C1C1E]/90 border-white/60 dark:border-white/10'
                }`}>

                {/* Header Badge */}
                <div className="absolute top-3 right-3 z-10">
                    <div className="flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-pulse" />
                        <span className="text-[9px] font-bold text-gray-900 dark:text-white/90 uppercase tracking-wider">一起听</span>
                    </div>
                </div>

                <div className="p-4 pt-5 flex items-center gap-4">
                    {/* Cover Art */}
                    {/* Cover Art - Pure Rotating Circle */}
                    <div className="relative w-14 h-14 shrink-0 shadow-xl rounded-full group-hover:scale-105 transition-transform duration-500">
                        <div className="w-full h-full rounded-full overflow-hidden shadow-lg animate-spin-slow ring-1 ring-black/5 dark:ring-white/10" style={{ animationDuration: '8s' }}>
                            <img src={metadata?.cover} className="w-full h-full object-cover" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 pt-1">
                        <span className="text-[15px] font-black leading-tight truncate tracking-tight text-gray-900 dark:text-white">
                            {metadata?.title || 'Unknown Title'}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <User size={10} className="text-gray-500 dark:text-gray-400" />
                            <span className="text-[11px] font-medium truncate text-gray-600 dark:text-gray-400">
                                {metadata?.artist || 'Unknown User'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer / Interaction */}
                <div className={`px-4 py-2.5 flex items-center justify-between border-t ${isUser ? 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5' : 'border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-white/5'
                    }`}>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400/80 tracking-wide">
                        点击加入同步播放
                    </span>
                    <div className="p-1 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[#FF3B30] group-hover:text-white transition-colors duration-300">
                        <Play size={10} className="text-gray-900 dark:text-white group-hover:text-white" fill="currentColor" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sticker Bubble ---
const StickerBubble = ({ stickerName }) => {
    // Clean up if it comes as "[Sticker: Name]"
    const cleanName = React.useMemo(() => {
        const match = stickerName.match(/\[Sticker:\s*(.*?)\]/);
        return match ? match[1] : stickerName;
    }, [stickerName]);

    // Live query to find the URL for this sticker name
    const sticker = useLiveQuery(() => db.stickers.where('name').equals(cleanName).first(), [cleanName]);

    if (!sticker) {
        // Fallback if sticker not found in DB
        return (
            <div className="bg-gray-100 dark:bg-[#2C2C2E] px-3 py-2 rounded-xl flex items-center gap-2">
                <Smile size={18} className="text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">[{cleanName}]</span>
            </div>
        );
    }

    return (
        <div className="max-w-[150px] max-h-[150px] overflow-hidden rounded-xl">
            <img src={sticker.url} alt={cleanName} className="w-full h-full object-cover" />
        </div>
    );
};

// --- Sticker Manager Modal ---
// --- Sticker Manager Modal ---
// --- Sticker Manager Panel (Inline) ---
const StickerPanel = ({ onClose, onSelect, onBack }) => {
    const [importText, setImportText] = useState('');
    const [activeCategory, setActiveCategory] = useState('默认');
    const [targetCategory, setTargetCategory] = useState(''); // New state for import target
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'import'

    const stickers = useLiveQuery(() => db.stickers.toArray()) || [];

    // Updated Categories with "Recent"
    const categories = useMemo(() => {
        const cats = new Set(stickers.map(s => s.category || '默认'));
        return ['最近', ...Array.from(cats).sort()];
    }, [stickers]);

    // Current filtered stickers
    const filteredStickers = useMemo(() => {
        if (activeCategory === '最近') {
            return stickers
                .filter(s => s.lastUsed)
                .sort((a, b) => b.lastUsed - a.lastUsed)
                .slice(0, 20);
        }
        return stickers.filter(s => (s.category || '默认') === activeCategory);
    }, [stickers, activeCategory]);

    // Wrapper to update usage
    const handleSelectSticker = (sticker) => {
        db.stickers.update(sticker.id, { lastUsed: Date.now() });
        if (onSelect) onSelect(sticker);
    };

    // Import State
    const [importTab, setImportTab] = useState('single'); // 'single', 'batch'
    const [singleName, setSingleName] = useState('');
    const [singleUrl, setSingleUrl] = useState(''); // For URL mode
    const [singleFile, setSingleFile] = useState(null); // For Local mode
    const [importSource, setImportSource] = useState('local'); // 'local', 'url'

    const handleSingleImport = async () => {
        const name = singleName.trim();
        const cat = targetCategory.trim() || '默认';

        if (!name) return alert('请输入表情名称');

        let urlRes = '';
        if (importSource === 'local') {
            if (!singleFile) return alert('请选择图片');
            // File to Base64
            urlRes = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(singleFile);
            });
        } else {
            if (!singleUrl.trim()) return alert('请输入图片链接');
            urlRes = singleUrl.trim();
        }

        // Check dup
        const exists = await db.stickers.where('name').equals(name).count();
        if (exists > 0) {
            if (!confirm(`表情 [${name}] 已存在，是否允许重名？`)) return;
        }

        await db.stickers.add({
            name,
            url: urlRes,
            category: cat,
            createdAt: Date.now(),
            lastUsed: Date.now() // Auto add to recent
        });

        alert(`已添加 [${name}] 到 [${cat}]`);
        // Reset
        setSingleName('');
        setSingleUrl('');
        setSingleFile(null);
    };

    const handleImport = async () => {
        if (!importText.trim()) return;

        // Determine target category: User input -> '默认'
        const finalCategory = targetCategory.trim() || '默认';

        const lines = importText.split('\n');
        let count = 0;
        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            let name = '';
            let url = '';

            let sepIdx = cleanLine.search(/[:：]/);
            if (sepIdx !== -1) {
                name = cleanLine.substring(0, sepIdx).trim();
                url = cleanLine.substring(sepIdx + 1).trim();
            } else {
                // Fallback: finding first space
                sepIdx = cleanLine.search(/\s/);
                if (sepIdx !== -1) {
                    name = cleanLine.substring(0, sepIdx).trim();
                    url = cleanLine.substring(sepIdx + 1).trim();
                }
            }

            if (name && url) {
                const exists = await db.stickers.where('name').equals(name).count();
                if (exists === 0) {
                    await db.stickers.add({
                        name,
                        url,
                        category: finalCategory,
                        createdAt: Date.now()
                    });
                    count++;
                }
            }
        }
        alert(`成功导入 ${count} 个表情到 [${finalCategory}]！`);
        setImportText('');
        setTargetCategory(''); // Reset
        setActiveCategory(finalCategory); // Switch to the new category
        setViewMode('grid');
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredStickers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredStickers.map(s => s.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (confirm(`确定删除选中的 ${selectedIds.length} 个表情吗？`)) {
            for (const id of selectedIds) {
                await db.stickers.delete(id);
            }
            setSelectedIds([]);
            if (stickers.length === selectedIds.length) {
                setIsEditMode(false);
            }
        }
    };

    const handleDeleteCategory = async () => {
        if (activeCategory === '默认' || activeCategory === '最近') return alert('此分类不能删除');
        if (confirm(`确定删除分类 [${activeCategory}] 及其下所有表情吗？`)) {
            const idsToDelete = filteredStickers.map(s => s.id);
            for (const id of idsToDelete) {
                await db.stickers.delete(id);
            }
            setActiveCategory('默认');
        }
    };

    return (
        <>
            {/* Import Mode - Compact Centered Modal */}
            <AnimatePresence>
                {viewMode === 'import' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-6"
                        onClick={() => setViewMode('grid')}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 10 }}
                            className="bg-white dark:bg-[#1C1C1E] w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[70vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Import Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/80 dark:bg-[#2C2C2E]/50 shrink-0">
                                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">导入表情</h3>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className="p-1.5 bg-gray-200 dark:bg-white/10 rounded-full text-gray-500 transition-colors hover:bg-gray-300 dark:hover:bg-white/20"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex p-1.5 mx-4 mt-4 bg-gray-100 dark:bg-white/5 rounded-xl shrink-0">
                                <button
                                    onClick={() => setImportTab('single')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${importTab === 'single' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    单张添加
                                </button>
                                <button
                                    onClick={() => setImportTab('batch')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${importTab === 'batch' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    批量导入
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-4 overflow-y-auto">

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">目标分类</label>
                                    <input
                                        type="text"
                                        value={targetCategory}
                                        onChange={e => setTargetCategory(e.target.value)}
                                        placeholder="不填写自动存入 [默认]"
                                        className="w-full bg-gray-100 dark:bg-[#2C2C2E] rounded-xl px-3 py-2.5 text-sm border-none outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400"
                                    />
                                </div>

                                {importTab === 'single' ? (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">表情名称</label>
                                            <input
                                                type="text"
                                                value={singleName}
                                                onChange={e => setSingleName(e.target.value)}
                                                placeholder="给表情起个名字..."
                                                className="w-full bg-gray-100 dark:bg-[#2C2C2E] rounded-xl px-3 py-2.5 text-sm border-none outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <button onClick={() => setImportSource('local')} className={`flex-1 py-1.5 text-[10px] font-bold border rounded-lg ${importSource === 'local' ? 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-white/10 text-gray-400'}`}>本地图片</button>
                                                <button onClick={() => setImportSource('url')} className={`flex-1 py-1.5 text-[10px] font-bold border rounded-lg ${importSource === 'url' ? 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-white/10 text-gray-400'}`}>网络链接</button>
                                            </div>

                                            {importSource === 'local' ? (
                                                <div
                                                    className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl h-24 flex flex-col items-center justify-center text-gray-400 gap-1 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer relative"
                                                >
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        accept="image/*"
                                                        onChange={e => {
                                                            const f = e.target.files[0];
                                                            if (f) {
                                                                setSingleFile(f);
                                                                if (!singleName) setSingleName(f.name.split('.')[0]);
                                                            }
                                                        }}
                                                    />
                                                    {singleFile ? (
                                                        <div className="flex flex-col items-center text-blue-500">
                                                            <ImageIcon size={20} />
                                                            <span className="text-xs font-bold truncate max-w-[150px]">{singleFile.name}</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Upload size={20} />
                                                            <span className="text-xs">点击选择图片</span>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <input
                                                    type="url"
                                                    value={singleUrl}
                                                    onChange={e => setSingleUrl(e.target.value)}
                                                    placeholder="https://..."
                                                    className="w-full bg-gray-100 dark:bg-[#2C2C2E] rounded-xl px-3 py-2.5 text-xs border-none outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                                />
                                            )}
                                        </div>

                                        <button
                                            onClick={handleSingleImport}
                                            className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                                        >
                                            确认添加
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">批量数据</label>
                                            <textarea
                                                value={importText}
                                                onChange={e => setImportText(e.target.value)}
                                                className="w-full h-32 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl p-3 text-xs font-mono border-none outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none placeholder:text-gray-400"
                                                placeholder={"支持格式：\n1. 名称 链接\n2. 名称:链接\n\n示例：\n开心 https://xx.png\n难过:https://xx.jpg"}
                                            />
                                        </div>

                                        <button
                                            onClick={handleImport}
                                            disabled={!importText.trim()}
                                            className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                                        >
                                            批量导入
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Normal Panel */}
            <AnimatePresence>
                {viewMode === 'grid' && (
                    <motion.div
                        initial={{ y: 20, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.95 }}
                        className="absolute bottom-24 left-4 right-4 h-80 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-black/5 dark:border-white/5 flex flex-col overflow-hidden z-50 origin-bottom"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 shrink-0">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 mr-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => { setActiveCategory(cat); setSelectedIds([]); }}
                                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${activeCategory === cat
                                            ? 'bg-blue-500 text-white shadow-md'
                                            : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setViewMode('import')}
                                    className="p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
                                    title="导入"
                                >
                                    <FolderPlus size={16} />
                                </button>
                                <button
                                    onClick={() => { setIsEditMode(!isEditMode); setSelectedIds([]); }}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${isEditMode ? 'bg-blue-500 text-white' : 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'}`}
                                >
                                    {isEditMode ? '完成' : '编辑'}
                                </button>
                            </div>
                        </div>

                        {/* Bulk Actions (Fixed Top) */}
                        {isEditMode && (
                            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between shrink-0">
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">已选 {selectedIds.length}</span>
                                <div className="flex gap-2">
                                    <button onClick={handleSelectAll} className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                        {selectedIds.length === filteredStickers.length ? '全不选' : '全选'}
                                    </button>
                                    <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="px-2 py-1 bg-red-500 text-white rounded-md text-[10px] font-bold disabled:opacity-50">
                                        删除
                                    </button>
                                    {activeCategory !== '默认' && (
                                        <button onClick={handleDeleteCategory} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-[10px] font-bold">
                                            删分类
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-3 bg-gray-50/30 dark:bg-black/20">
                            <div className="grid grid-cols-5 gap-2">
                                {filteredStickers.map(s => (
                                    <div
                                        key={s.id}
                                        className={`relative group aspect-square rounded-xl bg-white dark:bg-white/5 overflow-hidden cursor-pointer shadow-sm border border-gray-100 dark:border-white/5 transition-all ${isEditMode && selectedIds.includes(s.id) ? 'ring-2 ring-blue-500 scale-90' : 'active:scale-95'
                                            }`}
                                        onClick={() => isEditMode ? toggleSelect(s.id) : handleSelectSticker(s)}
                                    >
                                        <img src={s.url} className="w-full h-full object-cover" alt={s.name} />
                                        {isEditMode && (
                                            <div className="absolute top-1 right-1">
                                                {selectedIds.includes(s.id) ? (
                                                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white"><Check size={10} /></div>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-white/30 bg-black/10" />
                                                )}
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-black/40 p-0.5 text-[8px] text-white text-center truncate">{s.name}</div>
                                    </div>
                                ))}
                                {filteredStickers.length === 0 && (
                                    <div className="col-span-full py-8 flex flex-col items-center justify-center text-gray-400">
                                        <Smile size={32} className="mb-2 opacity-50" />
                                        <span className="text-xs">暂无表情</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatDetail;
