/**
 * 心动 App - 文本格式化工具
 * 将AI输出的特殊格式转换为富文本显示
 */

/**
 * 渲染故事文本为HTML
 * 支持: *动作* "对话" （心理）
 */
// 渲染故事文本为HTML
export const renderStoryText = (text) => {
    if (!text) return '';

    let result = text;

    // 1. 安全转义 (简单的)
    result = result.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 2. 匹配对话 "..." 或 “...”
    result = result.replace(/"([^"]+)"/g, '<span class="hb-dialogue">"$1"</span>');
    result = result.replace(/“([^”]+)”/g, '<span class="hb-dialogue">“$1”</span>');

    // 3. 匹配动作 *...* (非贪婪)
    result = result.replace(/\*([^*]+)\*/g, '<span class="hb-action">$1</span>');

    // 4. 匹配心理 （...） 或 (...) - 去掉括号，只显示内容
    result = result.replace(/（([^）]+)）/g, '<span class="hb-thought">$1</span>');
    result = result.replace(/\(([^)]+)\)/g, '<span class="hb-thought">$1</span>');

    // 5. 将换行转为 <br>
    result = result.replace(/\n/g, '<br>');

    return result;
};

/**
 * 提取纯文本（移除格式标记）
 */
export const extractPlainText = (text) => {
    if (!text) return '';

    let result = text;

    // 移除动作标记
    result = result.replace(/\*([^*]+)\*/g, '$1');

    // 移除对话标记
    result = result.replace(/"([^"]+)"/g, '$1');
    result = result.replace(/"([^"]+)"/g, '$1');

    // 移除心理标记
    result = result.replace(/（([^）]+)）/g, '$1');
    result = result.replace(/\(([^)]+)\)/g, '$1');

    return result.trim();
};

/**
 * 截取摘要（用于列表显示）
 */
export const extractSummary = (text, maxLength = 50) => {
    const plain = extractPlainText(text);
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength) + '...';
};

/**
 * 检测内容类型
 */
export const detectContentType = (text) => {
    if (!text) return 'mixed';

    const hasAction = /\*[^*]+\*/.test(text);
    const hasDialogue = /"[^"]+"/.test(text) || /"[^"]+"/.test(text);
    const hasThought = /（[^）]+）/.test(text) || /\([^)]+\)/.test(text);

    if (hasAction && !hasDialogue && !hasThought) return 'action';
    if (hasDialogue && !hasAction && !hasThought) return 'dialogue';
    if (hasThought && !hasAction && !hasDialogue) return 'thought';

    return 'mixed';
};

export default {
    renderStoryText,
    extractPlainText,
    extractSummary,
    detectContentType,
};
