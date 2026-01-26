import { db } from '../db/schema';

/**
 * HoshinoOS Unified LLM Service
 * "The Universal Cable"
 * 
 * This service connects any App (Messenger, Notes, etc.) to the 
 * API configuration stored in the Settings database.
 */

export const llmService = {

    /**
     * 获取当前激活的 API 配置
     * @returns {Promise<{endpoint: string, apiKey: string, model: string, temperature: number}|null>}
     */
    async getActiveConfig() {
        try {
            // 1. Get the ID of the active preset
            const activeId = await db.settings.get('active_api_id');
            if (!activeId?.value) return null;

            // 2. Get the actual config details
            const config = await db.apiConfigs.get(activeId.value);
            return config || null;
        } catch (e) {
            console.error('Failed to load API config:', e);
            return null;
        }
    },

    /**
     * 发送聊天请求 (Standard OpenAI Format)
     * @param {Array<{role: string, content: string}>} messages - Chat history
     * @param {Object} overrideOptions - Optional overrides (temp, model)
     * @returns {Promise<string>} The AI's response text
     */
    async chatCompletion(messages, overrideOptions = {}) {
        // 1. Load Config
        const config = await this.getActiveConfig();
        // Debug Info
        const activeId = await db.settings.get('active_api_id');

        if (!config || !config.endpoint || !config.apiKey) {
            const debugMsg = `配置丢失! ActiveID: ${activeId?.value || 'None'}, Config: ${config ? 'Found' : 'Null'}`;
            console.error(debugMsg);
            throw new Error(debugMsg + ' (请在电脑端重新去设置页点击[保存并激活])');
        }

        // 2. Prepare Request
        let rawEndpoint = config.endpoint.trim(); // Fix: Trim whitespace
        let baseUrl = rawEndpoint.replace(/\/+$/, '');
        let url;

        // Intelligent URL Construction
        if (baseUrl.endsWith('/chat/completions')) {
            url = baseUrl;
        } else if (baseUrl.endsWith('/v1')) {
            url = `${baseUrl}/chat/completions`;
        } else {
            url = `${baseUrl}/chat/completions`;
        }



        const payload = {
            model: overrideOptions.model || config.model || 'gpt-3.5-turbo',
            messages: messages,
            temperature: overrideOptions.temperature ?? config.temperature ?? 0.9,
            stream: false,
            // Max Tokens Logic: >0 use value; ===0 unlimited (omit); undefined default to 5000
            ...(overrideOptions.max_tokens > 0 ? { max_tokens: overrideOptions.max_tokens } : (overrideOptions.max_tokens === 0 ? {} : { max_tokens: 5000 })),
            ...(config.top_p !== undefined ? { top_p: config.top_p } : {}),
            ...overrideOptions
        };

        // --- DEBUG LOGGING ---
        console.group('🚀 LLM Request Context');
        console.log('📦 Messages:', payload.messages);
        console.groupEnd();
        // ---------------------

        // 3. Send Request
        // IMPORTANT: improved error handling
        try {
            const response = await fetch(url, {
                method: 'POST',
                keepalive: true, // PWA Optimization: Keep request alive in background
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();

                // User Request: Pass through ALL API errors (raw message), no custom Chinese.
                try {
                    const errorJson = JSON.parse(errorText);
                    // Use standard OpenAI error message field if available, otherwise fallback
                    const rawMsg = errorJson.error?.message || errorJson.message || errorText;
                    throw new Error(`API Error (${response.status}): ${rawMsg}`);
                } catch (e) {
                    // If JSON parse failed, throw raw text
                    // If the caught error is the one we just threw above, prop it.
                    if (e.message.startsWith('API Error')) throw e;

                    throw new Error(`API Error (${response.status}): ${errorText.slice(0, 200)}`);
                }
            }

            const data = await response.json();

            // Standard OpenAI response format
            if (data.choices && data.choices.length > 0 && data.choices[0].message?.content !== undefined) {
                return data.choices[0].message.content || '';
            } else {
                const debugStr = JSON.stringify(data).slice(0, 500); // Limit length
                console.error('[LLM] Invalid Response Structure:', data);
                throw new Error(`API 返回内容格式错误或为空 (Received: ${debugStr})`);
            }

        } catch (error) {
            console.error('LLM Request Failed:', error);
            throw error; // Propagate to UI
        }
    },

    /**
     * 估算 Token 数量 (Heuristic for CJK/English Mixed)
     * @param {string} text 
     * @returns {number} Estimated token count
     */
    estimateTokens(text) {
        if (!text) return 0;
        // CJK characters (approx 1.5 tokens)
        const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        // Other characters (approx 0.25 tokens - avg word len 4)
        const other = text.length - cjk;
        return Math.ceil(cjk * 1.5 + other / 4);
    },

    /**
     * 构建对话上下文 (Phase 2.5 Refactor)
     * @param {string} characterId
     * @param {string} conversationId
     * @param {string} userText 
     * @param {Object} options { historyLimit: number, replyCount: number, userPersona: string }
     */
    async buildContext(characterId, conversationId, userText, options = {}) {
        const { historyLimit = 0, replyCount = 5, noPunctuation = false } = options;

        // 1. Fetch Character
        const char = await db.characters.get(parseInt(characterId) || characterId); // ID compatibility
        if (!char) {
            // Fallback for testing/undefined char
            return [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: userText }];
        }

        // [Moved] Fetch History Early for scanning
        let historyQuery = db.messengerMessages
            .where('[conversationType+conversationId]')
            .equals(['single', conversationId])
            .reverse();

        if (historyLimit > 0) {
            historyQuery = historyQuery.limit(historyLimit);
        }

        let dbHistory = await historyQuery.toArray();
        // dbHistory is reversed (Newest First) because of .reverse() in query
        // We usually want Oldest First for the Context Array.
        const reversedHistory = dbHistory; // Keep newest first for keyword scanning
        const chronologicalHistory = [...dbHistory].reverse(); // Oldest first for context

        // 2. Fetch World Book (Enabled entries for this char)
        let worldBookText = 'None';
        if (db.worldBookEntries) {
            try {
                const wbEntries = await db.worldBookEntries
                    .filter(entry =>
                        entry.enabled !== false &&
                        (entry.isGlobal === true || entry.characterId === (parseInt(characterId) || characterId))
                    )
                    .toArray();

                // Keyword + Limit Logic (Simple substring match for now, could be improved)
                // We'll collect entries into buckets: before_char, after_char, after_scenario
                const wbBuckets = {
                    before_char: [],
                    after_char: [],
                    after_scenario: []
                };

                // Scan chat history for keywords (last 20 messages)
                const recentHistory = reversedHistory ? reversedHistory.slice(0, 20).map(m => m.content).join(' ') : '';

                wbEntries.forEach(e => {
                    // Check triggers
                    let shouldInclude = false;

                    // Always include if no keys defined (passive lore) OR if keys match
                    if (!e.keys || e.keys.trim() === '') {
                        shouldInclude = true;
                    } else {
                        const keys = e.keys.split(',').map(k => k.trim().toLowerCase());
                        if (keys.some(k => k && recentHistory.toLowerCase().includes(k))) {
                            shouldInclude = true;
                        }
                    }

                    if (shouldInclude) {
                        const pos = e.injectionPosition || 'before_char';
                        if (wbBuckets[pos]) wbBuckets[pos].push(e);
                        else wbBuckets['before_char'].push(e); // default
                    }
                });

                // Format helper
                const formatWB = (list) => list.length > 0
                    ? list.map(e => `[Information: ${e.title || 'Entry'}]\n${e.content}`).join('\n\n')
                    : '';

                options.wbContext = {
                    before_char: formatWB(wbBuckets.before_char),
                    after_char: formatWB(wbBuckets.after_char),
                    after_scenario: formatWB(wbBuckets.after_scenario)
                };

            } catch (e) {
                console.warn('WorldBook fetch failed:', e);
            }
        }

        // 3. Part 1: Global Core
        // Use passed userPersona if available
        const userP = options.userPersona;
        const userName = userP?.userName || 'User';
        const userDesc = userP?.description || 'Unknown';

        const wb = options.wbContext || { before_char: '', after_char: '', after_scenario: '' };

        const globalCore = `${wb.before_char ? wb.before_char + '\n\n' : ''}Identity: ${char.name}
Persona: ${char.personality || char.description || 'Unknown'}
${wb.after_char ? '\n' + wb.after_char + '\n' : ''}User: ${userName}
User Info: ${userDesc}
${char.relationship ? `Relationship: ${char.relationship}` : ''}
${wb.after_scenario ? '\n' + wb.after_scenario + '\n' : ''}`;

        // Fetch Sticker List
        let stickerPrompt = '';
        try {
            const stickers = await db.stickers.toArray();
            if (stickers.length > 0) {
                // Get all names
                const names = stickers.map(s => s.name).join(', ');
                stickerPrompt = `[Stickers Available]\nIMPORTANT: You can ONLY use the following stickers. Do NOT make up names.\nList: [${names}]\nSend with: [Sticker: ExactName]`;
            }
            // If no stickers, stickerPrompt stays empty
        } catch (e) {
            console.warn('Sticker fetch failed:', e);
        }

        // Enhanced Time Context
        const userTz = userP?.timezone || 'Asia/Shanghai';
        const charTz = char.timezone || 'Asia/Shanghai';

        const now = new Date();
        const fmt = (tz) => ({
            date: now.toLocaleDateString('zh-CN', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long' }),
            time: now.toLocaleTimeString('zh-CN', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }),
            hour: parseInt(now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', hour12: false })),
            period: (h) => h < 6 ? '凌晨' : h < 12 ? '上午' : h < 18 ? '下午' : '晚上'
        });

        const uT = fmt(userTz);
        const cT = fmt(charTz);

        let timeContext = `Global Time: ${now.toISOString()}\n`;
        timeContext += `User Local Time: ${uT.date} ${uT.period(uT.hour)} ${uT.time} (${userTz})\n`;

        if (userTz !== charTz) {
            timeContext += `Character Local Time: ${cT.date} ${cT.period(cT.hour)} ${cT.time} (${charTz})\n`;

            // Calculate time difference
            const userDate = new Date(now.toLocaleString('en-US', { timeZone: userTz }));
            const charDate = new Date(now.toLocaleString('en-US', { timeZone: charTz }));
            const diffHours = Math.round((charDate - userDate) / (1000 * 60 * 60));
            const diffStr = diffHours === 0 ? 'Same time' : diffHours > 0 ? `+${diffHours}h ahead` : `${diffHours}h behind`;
            timeContext += `Time Difference: ${diffStr}`;
        } else {
            timeContext += `(Same Timezone)`;
        }

        // Parse replyCount for display
        const replyDisplay = String(replyCount).includes('-')
            ? replyCount.replace('-', ' to ')
            : replyCount;

        // 4. Part 2: Messenger Prompt - STRENGTHENED
        const appPrompt = `[Context: HoshinoOS Messenger]
Device: HoshinoOS (Mobile)
Status: Chatting online via HOS Messenger.
[Time Context]
${timeContext}

[MANDATORY OUTPUT RULES]
1. FORMAT: Text ONLY. NO actions (*hugs*). NO thoughts ((thinking...)).
2. EXPRESSION: Text, Emojis, Kaomoji${stickerPrompt ? ', and Stickers from the list below' : ''}.
3. REPLY STRUCTURE (MUST FOLLOW):
   - You MUST output ${String(replyCount).includes('-') ? 'BETWEEN' : 'EXACTLY'} ${replyDisplay} separate message bubbles.
   - Each bubble MUST be under 80 Chinese characters or 150 English characters.
   - Separate each bubble with a SINGLE newline (\\n).
   - FAILURE TO SPLIT = SYSTEM ERROR. DO NOT ignore this.
${stickerPrompt ? stickerPrompt + '\n' : ''}${noPunctuation ? '4. NO PUNCTUATION: Omit all punctuation (,.!?). Use spaces/newlines instead.\n' : ''}${options.translationMode?.enabled ? `5. [BILINGUAL MODE]: 
   - OUTPUT FORMAT (Apply to EACH bubble): "Original Text (Character's Native Language) ||| Translated Text (Chinese)"
   - QUANTITY RULE: You MUST output ${replyDisplay} separate bubbles/lines as per Rule 3. The example below shows FORMAT ONLY, NOT QUANTITY.
   - EXAMPLE FORMAT:
     [Content 1] ||| [Translation 1]
     [Content 2] ||| [Translation 2]
     ...\n` : ''}
[Protocol]
- [User sent Image: ...]: React to visual details.
- [User sent Red Packet: ...]: React to money/luck.

[Commands]
- SEND STICKER: [Sticker: Name]
- SEND VOICE: [Voice: Message Content] (e.g. [Voice: 哼，不理你了])
- SEND RED PACKET: [RedPacket: Amount, Note] (e.g. [RedPacket: 100, 恭喜发财])
- SEND TRANSFER: [Transfer: Amount, Note] (e.g. [Transfer: 520, 拿去买好吃的])
- SEND GIFT: [Gift: GiftName] (e.g. [Gift: 鲜花])
- CONTROL MUSIC: [Music: Next] (Skip current song)
- PLAY MUSIC: [Music: Play keywords]

[System]
Never describe actions like *hands you a red packet*. Use [RedPacket: ...] command instead.`;

        // 6. Assemble Messages
        const messages = [
            { role: 'system', content: globalCore + "\n\n" + appPrompt }
        ];

        let lastMsgTime = 0;

        chronologicalHistory.forEach(msg => {
            if (msg.role && msg.content) {
                let content = msg.content;
                let timestampPrefix = '';

                // --- Smart Timestamp Injection ---
                // If gap > 2 hours, inject time context so AI feels the passage of time.
                if (msg.timestamp && (msg.timestamp - lastMsgTime > 2 * 60 * 60 * 1000)) {
                    const date = new Date(msg.timestamp);
                    const now = new Date();
                    const isToday = date.toDateString() === now.toDateString();
                    const yesterday = new Date(now);
                    yesterday.setDate(now.getDate() - 1);
                    const isYesterday = yesterday.toDateString() === date.toDateString();

                    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    let dayStr = '';
                    if (isToday) dayStr = 'Today';
                    else if (isYesterday) dayStr = 'Yesterday';
                    else dayStr = `${date.getMonth() + 1}/${date.getDate()}`;

                    timestampPrefix = `[Time: ${dayStr} ${timeStr}] `;
                }
                lastMsgTime = msg.timestamp || lastMsgTime;
                // ---------------------------------

                // Re-apply Rich Media descriptions if raw content isn't descriptive enough
                if (msg.msgType === 'image') content = `[User sent Image: ${msg.content}]`;
                // Clarify that this is INPUT format.
                if (msg.msgType === 'voice') content = `[Context: User sent Voice Message: "${msg.content}"]`;
                if (msg.msgType === 'gift') content = `[User sent Gift: ${msg.metadata?.giftName || msg.content}]`;
                if (msg.msgType === 'redpacket') content = `[User sent Red Packet: ${msg.metadata?.note}, Amount: ${msg.metadata?.amount}]`;
                if (msg.msgType === 'transfer') content = `[User transferred money: ${msg.metadata?.amount}, Note: ${msg.metadata?.note}]`;

                // Handle Revoked Messages
                if (msg.msgType === 'revoked') {
                    const who = msg.role === 'user' ? 'User' : 'Assistant';
                    content = `[System: ${who} revoked a message]`;
                } else {
                    // Apply timestamp prefix ONLY to active messages
                    content = timestampPrefix + content;
                }

                messages.push({ role: msg.role, content: content });
            }
        });

        if (userText) {
            messages.push({ role: 'user', content: userText });
        }

        // --- [NEW] Post-Instruction (Recency Bias) ---
        // 强化 Anti-OOC 和 时间感知
        const postTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        let postSystem = `[System Reminder]
1. Current Time: ${postTime} (${uT.period(uT.hour)}). React to the time if relevant.
2. STAY IN CHARACTER (${char.name}).
3. RULE: TEXT ONLY. NO ACTIONS (*...*) OR THOUGHTS ((...)).
4. FORMAT: ${String(replyCount).includes('-') ? 'BETWEEN' : 'EXACTLY'} ${replyDisplay} bubbles, split by single newline.`;

        // [STRONG BILINGUAL ENFORCEMENT]
        if (options.translationMode?.enabled) {
            postSystem += `\n5. [CRITICAL] BILINGUAL MODE ACTIVE.
   - OUTPUT FORMAT IS STRICTLY: "Original Content (Character's Native Language) ||| Translated Content (Chinese)"
   - You MUST include the separator " ||| ".
   - DO NOT REVERSE THE ORDER (Translation MUST be LAST).`;
        }

        messages.push({ role: 'system', content: postSystem });
        // ---------------------------------------------

        return messages;
    },

    /**
     * 发送流式消息 (Currently simulated via non-streaming)
     * @param {Array} messages 
     * @param {Function} onDelta 
     * @param {Function} onComplete 
     * @param {Function} onError 
     * @param {Object} options - Optional API parameters like max_tokens
     */
    async sendMessageStream(messages, onDelta, onComplete, onError, options = {}) {
        try {
            const text = await this.chatCompletion(messages, options);

            // Fix: Defensive check for undefined text to prevent crash at .length
            if (text === undefined || text === null) {
                throw new Error('LLM 返回了空内容，请重试');
            }

            // PWA Background Optimization: 
            // If the tab is hidden, skip simulation to ensure notification triggers immediately.
            if (document.visibilityState === 'hidden') {
                onDelta(text);
                onComplete(text);
                return;
            }

            // Simulate stream effect for better UX
            const chunk = 5; // chars per tick
            let current = 0;
            const len = text.length;

            const streamInterval = setInterval(() => {
                const next = Math.min(current + chunk, len);
                const delta = text.slice(current, next);
                onDelta(delta);
                current = next;

                if (current >= len) {
                    clearInterval(streamInterval);
                    onComplete(text);
                }
            }, 20); // Fast tycoon effect

        } catch (e) {
            onError(e);
        }
    },

    /**
     * 触发被动/主动关怀消息 (Background)
     * @param {string} conversationId 
     */
    async triggerProactiveMessage(conversationId) {
        try {
            const conv = await db.conversations.get(conversationId);
            if (!conv) return;

            const now = Date.now();
            const lastMsg = await db.messengerMessages
                .where('[conversationType+conversationId]')
                .equals(['single', conversationId])
                .last();

            if (!lastMsg) return;

            // Double check timing (redundant but safe)
            const hoursSilent = (now - lastMsg.timestamp) / (1000 * 60 * 60);

            // Build Context
            // We use standard buildContext to ensure Persona/WorldBook rules apply
            const contextMessages = await this.buildContext(
                conv.characterId,
                conversationId,
                '', // No user input
                {
                    historyLimit: conv.historyLimit || 20,
                    replyCount: conv.replyCount || '2-5', // Respect settings
                    noPunctuation: conv.noPunctuation,
                    translationMode: conv.translationMode
                }
            );

            // Inject the "Trigger" System Prompt
            // This acts as the "Ghost User" telling the AI what to do
            const triggerPrompt = `[System Message]
Current Time: ${new Date().toLocaleTimeString()}
Status: The user has been silent for ${hoursSilent.toFixed(1)} hours.
Action: Initiate a proactive message to check on the user or restart the conversation.
Guidelines:
1. Stay in Character.
2. React naturally to the silence.
3. OUTPUT FORMAT: Follow the standard spacing/length rules defined above (Reply Count: ${conv.replyCount || 'Standard'}).`;

            // Change to 'user' role to ensure compatibility with strict API providers that dislike trailing system messages
            contextMessages.push({ role: 'user', content: triggerPrompt });

            // Call API (Non-stream)
            const text = await this.chatCompletion(contextMessages, {
                max_tokens: conv.maxTokens !== 0 ? conv.maxTokens : undefined
            });

            // Save to DB (Split Bubbles Logic)
            if (text) {
                // Split by newline to respect "Separate Bubbles" rule
                const bubbles = text.split('\n').map(t => t.trim()).filter(t => t);

                let timeOffset = 0;
                for (const bubbleContent of bubbles) {
                    await db.messengerMessages.add({
                        conversationType: 'single',
                        conversationId: conversationId,
                        role: 'assistant',
                        content: bubbleContent,
                        msgType: 'text',
                        metadata: { isProactive: true },
                        timestamp: Date.now() + timeOffset
                    });
                    timeOffset += 100; // Ensure ordering
                }

                // Update Conversation
                await db.conversations.update(conversationId, { updatedAt: Date.now() });

                // Return full text for notification body
                return { text: bubbles.join('\n'), characterId: conv.characterId };
            }

        } catch (e) {
            console.error('Proactive Trigger Failed:', e);
        }
        return null;
    }
};
