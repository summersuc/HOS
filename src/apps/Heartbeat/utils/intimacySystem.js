/**
 * 心动 App - 亲密度系统
 */

// 亲密度变化事件类型
export const INTIMACY_EVENTS = {
    DAILY_CHAT: 'daily_chat',
    SWEET_TALK: 'sweet_talk',
    PHYSICAL_CONTACT: 'physical_contact',
    GIFT: 'gift',
    DATE_COMPLETE: 'date_complete',
    CONFLICT: 'conflict',
    IGNORE: 'ignore',
    CONFESSION: 'confession',
};

// 每种事件的亲密度变化值
const INTIMACY_CHANGES = {
    [INTIMACY_EVENTS.DAILY_CHAT]: 1,
    [INTIMACY_EVENTS.SWEET_TALK]: 2,
    [INTIMACY_EVENTS.PHYSICAL_CONTACT]: 3,
    [INTIMACY_EVENTS.GIFT]: 5,
    [INTIMACY_EVENTS.DATE_COMPLETE]: 4,
    [INTIMACY_EVENTS.CONFLICT]: -3,
    [INTIMACY_EVENTS.IGNORE]: -2,
    [INTIMACY_EVENTS.CONFESSION]: 10,
};

/**
 * 计算亲密度变化
 */
export const calculateIntimacyChange = (eventType) => {
    return INTIMACY_CHANGES[eventType] || 0;
};

/**
 * 应用亲密度变化
 */
export const applyIntimacyChange = (currentIntimacy, eventType) => {
    const change = calculateIntimacyChange(eventType);
    return Math.max(0, Math.min(100, currentIntimacy + change));
};

// 亲密度里程碑
export const INTIMACY_MILESTONES = {
    10: { title: '初次相识', icon: '👋', description: '你们刚刚认识' },
    30: { title: '关系升温', icon: '💝', description: '可以开始称呼昵称了' },
    50: { title: '心意相通', icon: '💕', description: '可以牵手了' },
    70: { title: '恋人关系', icon: '💗', description: '可以拥抱、亲吻了' },
    90: { title: '热恋期', icon: '💓', description: '解锁所有亲密互动' },
    100: { title: '灵魂伴侣', icon: '💞', description: '你们的心紧紧相连' },
};

/**
 * 获取当前亲密度阶段
 */
export const getIntimacyStage = (intimacy) => {
    const milestoneKeys = Object.keys(INTIMACY_MILESTONES)
        .map(Number)
        .sort((a, b) => b - a);

    for (const key of milestoneKeys) {
        if (intimacy >= key) {
            return { level: key, ...INTIMACY_MILESTONES[key] };
        }
    }

    return { level: 0, title: '陌生人', icon: '❓', description: '还未开始' };
};

/**
 * 获取下一个里程碑
 */
export const getNextMilestone = (intimacy) => {
    const milestoneKeys = Object.keys(INTIMACY_MILESTONES)
        .map(Number)
        .sort((a, b) => a - b);

    for (const key of milestoneKeys) {
        if (intimacy < key) {
            return { level: key, ...INTIMACY_MILESTONES[key], remaining: key - intimacy };
        }
    }

    return null; // 已达到最高
};

/**
 * 检测是否触发里程碑
 */
export const checkMilestoneReached = (oldIntimacy, newIntimacy) => {
    const milestoneKeys = Object.keys(INTIMACY_MILESTONES).map(Number);

    for (const key of milestoneKeys) {
        if (oldIntimacy < key && newIntimacy >= key) {
            return { level: key, ...INTIMACY_MILESTONES[key] };
        }
    }

    return null;
};

export default {
    INTIMACY_EVENTS,
    calculateIntimacyChange,
    applyIntimacyChange,
    INTIMACY_MILESTONES,
    getIntimacyStage,
    getNextMilestone,
    checkMilestoneReached,
};
