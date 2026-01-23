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
            temperature: overrideOptions.temperature ?? config.temperature ?? 0.7,
            stream: false,
            ...(overrideOptions.max_tokens ? { max_tokens: overrideOptions.max_tokens } : {}),
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
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error?.message || `API Error: ${response.status}`);
                } catch (e) {
                    throw new Error(`API Connection Failed (${response.status}): ${errorText.slice(0, 100)}`);
                }
            }

            const data = await response.json();

            // Standard OpenAI response format
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            } else {
                throw new Error('API returned empty choices');
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
Relationship: ${char.relationship || 'Stranger'}
${wb.after_scenario ? '\n' + wb.after_scenario + '\n' : ''}`;

        // Fetch Sticker List - FIXED: No more contradictory rules
        let stickerPrompt = '';
        try {
            const stickers = await db.stickers.toArray();
            if (stickers.length > 0) {
                const names = stickers.slice(0, 20).map(s => s.name).join(', '); // Limit to 20 to save tokens
                stickerPrompt = `[Stickers Available]\nYou can use: [${names}]\nSend with: [Sticker: ExactName]`;
            }
            // If no stickers, stickerPrompt stays empty - no confusing "NEVER use" rules
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
   - You MUST output EXACTLY ${replyDisplay} separate message bubbles.
   - Each bubble MUST be under 80 Chinese characters or 150 English characters.
   - Separate each bubble with a SINGLE newline (\\n).
   - FAILURE TO SPLIT = SYSTEM ERROR. DO NOT ignore this.
${stickerPrompt ? stickerPrompt + '\n' : ''}${noPunctuation ? '4. NO PUNCTUATION: Omit all punctuation (,.!?). Use spaces/newlines instead.\n' : ''}${options.translationMode?.enabled ? '5. [BILINGUAL MODE]: You MUST reply in the character\'s native language, then append a Chinese translation using the command: [Translation: Chinese content here].\n' : ''}
[Protocol]
- [User sent Image: ...]: React to visual details.
- [User sent Red Packet: ...]: React to money/luck.

[Commands]
- SEND STICKER: [Sticker: Name]
- SEND RED PACKET: [RedPacket: Amount, Note]
- SEND TRANSFER: [Transfer: Amount, Note]
- SEND GIFT: [Gift: GiftName]

[System]
Never describe actions like *hands you a red packet*. Use [RedPacket: ...] command instead.`;

        // 6. Assemble Messages
        const messages = [
            { role: 'system', content: globalCore + "\n\n" + appPrompt }
        ];

        chronologicalHistory.forEach(msg => {
            if (msg.role && msg.content) {
                let content = msg.content;
                // Re-apply Rich Media descriptions if raw content isn't descriptive enough
                if (msg.msgType === 'image') content = `[User sent Image: ${msg.content}]`;
                if (msg.msgType === 'gift') content = `[User sent Gift: ${msg.metadata?.giftName || msg.content}]`;
                if (msg.msgType === 'redpacket') content = `[User sent Red Packet: ${msg.metadata?.note}, Amount: ${msg.metadata?.amount}]`;
                if (msg.msgType === 'transfer') content = `[User transferred money: ${msg.metadata?.amount}, Note: ${msg.metadata?.note}]`;

                // Handle Revoked Messages
                if (msg.msgType === 'revoked') {
                    // Inform AI that a message was revoked, but hide content
                    const who = msg.role === 'user' ? 'User' : 'Assistant';
                    content = `[System: ${who} revoked a message]`;
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
        const postSystem = `[System Reminder]
1. Current Time: ${postTime} (${uT.period(uT.hour)}). React to the time if relevant.
2. STAY IN CHARACTER (${char.name}).
3. RULE: TEXT ONLY. NO ACTIONS (*...*) OR THOUGHTS ((...)).
4. FORMAT: EXACTLY ${replyDisplay} bubbles, split by single newline.`;

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
    }
};
