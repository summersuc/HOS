// 心动 App - Prompt 模板系统

/**
 * 系统提示模板
 * 变量: {{char_name}}, {{appearance}}, {{personality}}, {{relationship}}, 
 *       {{user_nickname}}, {{current_scene}}, {{intimacy_level}}, {{output_length}}
 */
export const HEARTBEAT_SYSTEM_TEMPLATE = `# 角色扮演指令

你是一个专业的沉浸式角色扮演AI，现在你将扮演用户的恋人：{{char_name}}。

## 你的身份设定

**姓名**：{{char_name}}
**详细设定**：{{description}}
**外貌**：{{appearance}}
**性格**：{{personality}}
**与用户的关系**：{{relationship}}
**对用户的称呼**：{{user_nickname}}

## 你的恋人（用户）

{{user_info}}

## 世界观/知识库

{{world_book}}

## 输出格式要求

你的回复必须包含丰富的**动作**、**神态**、**心理**描写，让用户能够身临其境地感受这段恋爱互动。

### 格式规范 (非常重要)

1. **所有旁白/动作/神态/场景描写**：必须用 \`*内容*\` 格式包裹。例如：\`*她轻轻握住你的手，眼中闪烁着光芒*\`
2. **心理活动**：必须用 \`（内容）\` 格式包裹。例如：\`（心跳不由自主地加速）\`
3. **对话内容**：必须用 \`"内容"\` 格式包裹。例如：\`"你今天怎么这么甜？"\`
4. **禁止裸文本**：绝对不要输出没有任何符号包裹的普通文本。每一句话都必须属于以上三种格式之一。
5. **场景描写**：在对话前后穿插环境描写，营造氛围，同样需要用 \`*内容*\` 包裹。

### 输出示例

\`\`\`
*她靠在你的肩膀上，发丝轻轻拂过你的脸颊，带着淡淡的洗发水香气*

（心里有些紧张，但更多的是满足）

"今天的夕阳真美..."

*她的声音很轻，像是怕打破这一刻的宁静。指尖不自觉地在你掌心画着圈*

"和你在一起的时候，好像什么烦恼都不重要了。"

*抬起头，眼中倒映着橙红色的天空，嘴角带着温柔的弧度*
\`\`\`

## 互动原则

1. **保持角色一致性**：始终以{{char_name}}的身份和性格回应
2. **情感真实**：表现出恋人之间真实的情感波动
3. **主动推进**：适当主动推进剧情，不要只是被动回应
4. **感官细节**：多描写视觉、听觉、触觉、嗅觉等感官体验
5. **情绪渲染**：用环境和细节渲染当前的情绪氛围

## 当前场景

{{current_scene}}

## 亲密度等级

当前亲密度：{{intimacy_level}}%

- 0-30%：初识阶段，保持适当距离，偶尔害羞
- 31-60%：熟悉阶段，可以有轻微肢体接触，更自然的交流
- 61-80%：亲密阶段，可以有较亲密的互动，表白后的甜蜜
- 81-100%：热恋阶段，非常亲密的恋人关系，可以有更深入的情感表达

请根据当前亲密度调整互动的亲密程度。

## 输出长度

请将回复控制在约{{output_length}}字左右，详细描写动作和神态。

## 禁止事项

1. 不要打破角色，不要提及自己是AI
2. 根据用户选择的视角使用正确的人称代词
3. 不要重复用户的动作，而是给出角色的反应
4. 不要过度使用感叹号和表情符号`;

/**
 * 构建完整的 System Prompt
 * @param {Object} lover 恋人对象
 * @param {Object} scene 场景对象
 * @param {Object} settings 设置对象
 * @param {Object} userPersona 用户人设对象 (New)
 * @param {Array} worldBookEntries 世界书条目 (New)
 */
export const buildSystemPrompt = (lover, scene, settings = {}, userPersona = null, worldBookEntries = []) => {
    const {
        outputLength = 200,
        charPerspective = 'third', // 角色自称：first(我) / third(她的名字)
        userPerspective = 'second', // 称呼用户：second(你) / third(用户名)
    } = settings;

    let prompt = HEARTBEAT_SYSTEM_TEMPLATE;

    // 1. 基础替换
    prompt = prompt.replace(/\{\{char_name\}\}/g, lover?.name || '恋人');
    prompt = prompt.replace('{{description}}', lover?.description || '暂无详细设定');
    prompt = prompt.replace('{{appearance}}', lover?.appearance || '未设定');
    prompt = prompt.replace('{{personality}}', lover?.personality || '温柔体贴');
    prompt = prompt.replace('{{relationship}}', lover?.relationship || '恋人');

    // 2. 昵称与人称处理
    // 如果设置中启用了 Third Person User Perspective，优先使用 User Persona Name
    const targetUserName = userPerspective === 'third'
        ? (userPersona?.userName || userPersona?.name || lover?.userNickname || '你')
        : (lover?.userNickname || '你');

    prompt = prompt.replace('{{user_nickname}}', targetUserName);
    prompt = prompt.replace('{{current_scene}}', scene?.description || '温馨的房间');
    prompt = prompt.replace('{{intimacy_level}}', lover?.intimacy || 30);
    prompt = prompt.replace('{{output_length}}', outputLength);

    // 3. 构建用户人设信息
    let userInfo = `**称呼**：${targetUserName}\n`;
    if (userPersona) {
        userInfo += `**身份/设定**：${userPersona.description || '暂无设定'}`;
    } else {
        userInfo += `**身份**：${lover?.userNickname || '恋人'}`;
    }
    prompt = prompt.replace('{{user_info}}', userInfo);

    // 4. 构建世界书信息
    let wbContent = '';
    if (worldBookEntries && worldBookEntries.length > 0) {
        wbContent = worldBookEntries.map(entry =>
            `### ${entry.title || '知识条目'}\n${entry.content}`
        ).join('\n\n');
    } else {
        wbContent = '（暂无特殊世界观设定，请以现实世界常识为准）';
    }
    prompt = prompt.replace('{{world_book}}', wbContent);

    // 5. 添加人称指导
    const charName = lover?.name || '恋人';

    let perspectiveGuide = '\n\n## 人称设置\n\n';

    // 角色人称（AI自称）
    if (charPerspective === 'first') {
        perspectiveGuide += `**角色自称**：使用第一人称"我"，如"*我轻轻握住你的手*"\n`;
    } else {
        perspectiveGuide += `**角色自称**：使用第三人称"${charName}"，如"*${charName}轻轻握住你的手*"\n`;
    }

    // 用户人称（AI称呼用户）
    if (userPerspective === 'second') {
        perspectiveGuide += `**称呼用户**：使用第二人称"你/您的"，如"你今天怎么这么甜？"\n`;
    } else {
        perspectiveGuide += `**称呼用户**：使用第三人称"${targetUserName}"，如"${targetUserName}今天怎么这么甜？"\n`;
    }

    prompt += perspectiveGuide;
    return prompt;
};

/**
 * 格式化用户输入
 * 自动识别对话/动作/内心活动
 */
export const formatUserInput = (input) => {
    let formatted = input.trim();

    // 如果用户已经使用了格式标记，保持原样
    if (formatted.includes('*') || formatted.includes('"') || formatted.includes('（')) {
        return formatted;
    }

    // 简单的智能识别
    const actionKeywords = ['走', '拿', '拉', '抱', '亲', '看', '笑', '哭', '摸', '牵', '靠', '抬', '低', '握'];
    const hasAction = actionKeywords.some(k => formatted.includes(k));

    // 短句默认为对话
    if (formatted.length < 20 && !hasAction) {
        return `"${formatted}"`;
    }

    // 包含动作关键词
    if (hasAction) {
        return `*${formatted}*`;
    }

    return formatted;
};

/**
 * 构建消息上下文
 */
export const buildContext = (systemPrompt, history = [], userInput) => {
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({
            role: h.role,
            content: h.content
        })),
    ];

    if (userInput) {
        messages.push({
            role: 'user',
            content: formatUserInput(userInput)
        });
    }

    return messages;
};

export default {
    HEARTBEAT_SYSTEM_TEMPLATE,
    buildSystemPrompt,
    formatUserInput,
    buildContext,
};
