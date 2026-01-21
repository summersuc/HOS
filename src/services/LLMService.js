import { db } from '../db/schema';

class LLMService {
    constructor() {
        this.abortController = null;
    }

    // 1. 获取配置
    async getConfig() {
        const settings = await db.settings.get('apiConfig');
        return {
            apiUrl: settings?.value?.apiUrl || 'https://api.openai.com/v1',
            apiKey: settings?.value?.apiKey || '',
            model: settings?.value?.model || 'gpt-3.5-turbo',
        };
    }

    // 2. 构建上下文 (Prompt Assembly)
    async buildContext(characterId, conversationId, userMessage, historyLimit = 20) {
        // Fetch Data
        const character = await db.characters.get(characterId);
        const conversation = await db.conversations.get(conversationId);

        // Active Persona
        // First try to find persona explicitly linked to conversation (future proofing), 
        // fallback to globally active persona
        let persona = null;
        if (conversation?.userPersonaId) {
            persona = await db.userPersonas.get(conversation.userPersonaId);
        }
        if (!persona) {
            persona = await db.userPersonas.filter(p => p.isActive === true).first();
        }

        // Chat History
        // Use historyLimit from argument (user setting)
        const history = await db.messengerMessages
            .where('[conversationType+conversationId]')
            .equals(['single', conversationId])
            .reverse() // Newest first
            .limit(historyLimit || 20)
            .toArray();
        history.reverse(); // Back to chronological order

        // World Book Scanning
        const worldEntries = await db.worldBookEntries.filter(e => e.enabled === true).toArray();
        const relevantEntries = [];

        // Scan text: Last 5 messages + active input
        const scanText = [...history.slice(-5).map(m => m.content), userMessage].join('\n');

        worldEntries.forEach(entry => {
            if (!entry.keys) return;
            const keywords = entry.keys.split(/[,，]/).map(k => k.trim()).filter(k => k);
            if (keywords.some(k => scanText.includes(k))) {
                relevantEntries.push(entry);
            }
        });

        // --- Construct Messages ---
        const messages = [];

        // --- SYSTEM PROMPT CONSTRUCTION ---
        let systemContent = `你正在进行角色扮演。\n`;

        // 1. World Book (Top Injection)
        // For simplicity, we treat anything not explicitly 'bottom' as top for now, or check scope/position
        // Assuming entry.position could be 'top' or 'bottom'
        const topWorldInfo = relevantEntries.filter(e => e.position !== 'bottom').map(e => e.content).join('\n');
        if (topWorldInfo) {
            systemContent += `\n[世界观/背景设定]:\n${topWorldInfo}\n`;
        }

        // 2. Character Def
        systemContent += `\n[角色设定]:\n姓名: ${character.name}\n`;
        if (character.nickname) systemContent += `昵称: ${character.nickname}\n`;
        if (character.description) systemContent += `描述: ${character.description}\n`;
        if (character.personality) systemContent += `性格: ${character.personality}\n`;
        if (character.scenario) systemContent += `场景: ${character.scenario}\n`;

        // 3. User Persona
        systemContent += `\n[用户设定]:\n姓名: ${persona?.userName || 'User'}\n`;
        if (persona?.description) systemContent += `描述: ${persona.description}\n`;

        // 4. World Book (Bottom Injection) - stronger influence usually
        const bottomWorldInfo = relevantEntries.filter(e => e.position === 'bottom').map(e => e.content).join('\n');
        if (bottomWorldInfo) {
            systemContent += `\n[附加设定/当前状态]:\n${bottomWorldInfo}\n`;
        }

        // 5. Instruction
        systemContent += `\n[系统指令]:\n1. 保持人设沉浸，不要跳出角色。\n2. 除非有特殊指示，否则禁止使用 "${character.name}:" 这样的前缀。\n3. 回复口语化，生动自然。\n`;
        if (character.firstMessage) systemContent += `参考开场白风格: ${character.firstMessage}\n`;

        messages.push({ role: 'system', content: systemContent });

        // Example Dialogue (Few-shot)
        if (character.exampleDialogue) {
            messages.push({ role: 'system', content: `[示例对话]:\n${character.exampleDialogue}` });
        }

        // History
        history.forEach(msg => {
            // Check if message content is a JSON object (custom types) or plain text
            // For now assuming plain text. 
            // Also map 'system' messages in chat (like Gift/RedPacket events) to 'system' role or 'user' role
            // OpenAI usually handles 'system' role in middle of chat fine, or we can wrap in [System Message]
            let role = 'user';
            let content = msg.content;

            if (msg.role === 'assistant') role = 'assistant';
            if (msg.role === 'system') {
                role = 'system'; // Or 'user', depending on model preference. 'system' is better for "User sent a gift"
            }

            messages.push({ role, content });
        });

        // Current User Message
        messages.push({ role: 'user', content: userMessage });

        return messages;
    }

    // 3. 发送请求 (Streaming)
    async sendMessageStream(messages, onDelta, onComplete, onError) {
        const config = await this.getConfig();
        if (!config.apiKey) {
            onError(new Error('请先在"设置"中配置 API Key'));
            return;
        }

        try {
            this.abortController = new AbortController();

            let endpoint = config.apiUrl;
            if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
            if (!endpoint.endsWith('/chat/completions')) endpoint += '/chat/completions';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: messages,
                    stream: true,
                    temperature: 0.8,
                    max_tokens: 1000,
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`API 请求失败: ${response.status} - ${err}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.trim() === 'data: [DONE]') continue;
                    if (!line.startsWith('data: ')) continue;

                    try {
                        const json = JSON.parse(line.slice(6));
                        const content = json.choices[0]?.delta?.content || '';
                        if (content) {
                            fullText += content;
                            onDelta(content);
                        }
                    } catch (e) {
                        console.warn('Error parsing stream chunk:', e);
                    }
                }
            }

            onComplete(fullText);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request aborted');
            } else {
                console.error('LLM Request Failed:', error);
                onError(error);
            }
        } finally {
            this.abortController = null;
        }
    }

    stop() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }
}

export const llmService = new LLMService();
