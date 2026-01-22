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
            stream: false, // For Phase 1, we use non-streaming for simplicity
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

        // 2. Fetch World Book (Enabled entries for this char)
        let worldBookText = 'None';
        if (db.worldBookEntries) {
            try {
                const wbEntries = await db.worldBookEntries
                    .where('characterId').equals(parseInt(characterId) || characterId)
                    .filter(entry => entry.enabled !== false)
                    .toArray();

                // Sort by priority (insertion order), descending or ascending logic if field exists
                // Since schema might not have priority yet, we'll just join comfortably.
                if (wbEntries.length > 0) {
                    worldBookText = wbEntries.map(e => `[Info: ${e.title}]\n${e.content}`).join('\n\n');
                }
            } catch (e) {
                console.warn('WorldBook fetch failed:', e);
            }
        }

        // 3. Part 1: Global Core
        // Use passed userPersona if available
        const userP = options.userPersona;
        const userName = userP?.userName || 'User';
        const userDesc = userP?.description || 'Unknown';

        const globalCore = `Identity: ${char.name}
Persona: ${char.personality || char.description || 'Unknown'}
User: ${userName}
User Info: ${userDesc}
Relationship: ${char.relationship || 'Stranger'}
World Book Info:
${worldBookText}`;

        // Fetch Sticker List
        let stickerPrompt = '';
        try {
            const stickers = await db.stickers.toArray();
            if (stickers.length > 0) {
                const names = stickers.map(s => s.name).join(', ');
                stickerPrompt = `4. STICKERS: You have access to these stickers: [${names}]. You can send a sticker by outputting [Sticker: Name]. If the list is empty, DO NOT send any stickers. ONLY use names from this exact list.`;
            } else {
                stickerPrompt = `4. STICKERS: You have ZERO stickers in your library. NEVER output any text in brackets like [Sticker: ...] or anything similar. If you do, the system will error. Use ONLY text, emojis, and kaomoji.`;
            }
        } catch (e) {
            console.warn('Sticker fetch failed:', e);
        }

        // 4. Part 2: Messenger Prompt
        const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const appPrompt = `[Context: HoshinoOS Messenger]
Device: HoshinoOS (Mobile)
Status: Chatting online via HOS Messenger.
Time: ${timeStr}

[Rules]
1. OUTPUT FORMAT: ONLY Language/Text. NO actions (e.g. *hugs*). NO psychological descriptions (e.g. (thinking...)). 
2. EXPRESSION: Use Text, Emojis, Kaomoji, and [Sticker] matching your Persona.
3. REPLY LENGTH & SPLITTING: 
   - You MUST split your response into multiple bubbles/paragraphs.
   - Separate each independent thought or bubble with a single NEWLINE (\n).
   - Aim for ${String(replyCount).includes('-') ? replyCount.replace('-', ' to ') : replyCount} bubbles per turn.
   - DO NOT bunch everything into one block. Use newlines aggressively to simulate real chatting.
${stickerPrompt}
${noPunctuation ? '4. NO PUNCTUATION: Do NOT use any punctuation marks (like , . ! ?). Use spaces/newlines to separate sentences instead. This is a unique style requirement.\n' : ''}
[Protocol]
- [User sent Image: ...]: React to visual details.
- [User sent Red Packet: ...]: React to money/luck.

[Commands] (Use these to perform actions)
- SEND STICKER: [Sticker: Name] (Check list above)
- SEND RED PACKET: [RedPacket: Amount, Note] (e.g. [RedPacket: 200, 大吉大利])
- SEND TRANSFER: [Transfer: Amount, Note] (e.g. [Transfer: 520, 拿去买皮肤])
- SEND GIFT: [Gift: GiftName] (e.g. [Gift: 鲜花])

[System]
Never describe actions like *hands you a red packet*. INSTEAD, use the [RedPacket: ...] command.
REMEMBER: Split bubbles with newlines!`;

        // 5. Fetch History
        let historyQuery = db.messengerMessages
            .where('[conversationType+conversationId]')
            .equals(['single', conversationId])
            .reverse();

        // 0 = No Limit (Infinity)
        if (historyLimit > 0) {
            historyQuery = historyQuery.limit(historyLimit);
        }

        let history = await historyQuery.toArray();
        history = history.reverse(); // Oldest first

        // 6. Assemble Messages
        const messages = [
            { role: 'system', content: globalCore + "\n\n" + appPrompt }
        ];

        history.forEach(msg => {
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

        return messages;
    },

    /**
     * 发送流式消息 (Currently simulated via non-streaming)
     * @param {Array} messages 
     * @param {Function} onDelta 
     * @param {Function} onComplete 
     * @param {Function} onError 
     */
    async sendMessageStream(messages, onDelta, onComplete, onError) {
        try {
            const text = await this.chatCompletion(messages);

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
