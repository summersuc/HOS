import Dexie from 'dexie';

export const db = new Dexie('HoshinoOS_Pro');

// 数据库版本 1
db.version(1).stores({
    settings: 'key',
    layout: 'id, dockApps, desktopApps, widgets',
    wallpaper: 'id, type, data',
    notificationSettings: 'appId, enabled',
    apiConfigs: 'id, name, endpoint, apiKey',
    messages: '++id, appId, timestamp, content, status, mode',
    posts: '++id, timestamp, content, reactions',
    notes: '++id, timestamp, title, content',
    appOverrides: 'id, name, icon',
    fonts: '++id, name, source, type',
    widgets: 'id, type, size, x, y, settings',
});

// 数据库版本 2: 新增信息 App 相关表
db.version(2).stores({
    characters: '++id, name, avatar, createdAt',
    worldBooks: '++id, title, scope, position, createdAt',
    conversations: '++id, characterId, title, updatedAt',
    groupChats: '++id, name, createdAt', // memberIds 存储在记录内
    // 扩展 messages 索引以便按对话查询
    messengerMessages: '++id, [conversationType+conversationId], role, timestamp'
});

// 数据库版本 3: 新增日历相关表
db.version(3).stores({
    // 日历事件
    calendarEvents: '++id, date, startTime, endTime, isAllDay, calendarId',
    // 纪念日
    anniversaries: '++id, date, isLunar, type, createdAt',
    // 生理期记录
    periodLogs: '++id, startDate, endDate',
    // 日历分类
    calendars: '++id, name, color, isDefault'
});

// 数据库版本 4: 信息 App V2.0 (SillyTavern 内核)
db.version(4).stores({
    // 角色卡 (对标 ST Character Card)
    characters: '++id, name, avatar, isFavorite, createdAt',
    // 额外字段: description, personality, scenario, firstMessage, exampleDialogue, authorNote

    // 世界书条目 (支持触发词)
    worldBookEntries: '++id, title, keywords, scope, characterId, depth, enabled, createdAt',
    // 额外字段: content

    // 用户人设 (支持多套)
    userPersonas: '++id, name, userName, isActive, createdAt',
    // 额外字段: description

    // Prompt 预设模板
    promptPresets: '++id, name, isActive, createdAt',
    // 额外字段: template (JSON array of sections)

    // 对话 (关联角色+人设)
    conversations: '++id, characterId, userPersonaId, title, updatedAt',

    // 消息 (支持分支)
    // 额外字段: content, branchIndex
});

// Database Auto-Repair Logic (PWA Corruption Handle)
db.open().catch(async (err) => {
    console.error('Database Open Failed:', err);

    // Detect classic iOS PWA corruption errors
    const isCorruption = err.name === 'UnknownError' ||
        err.name === 'OpenFailedError' ||
        (err.message && (err.message.includes('disk') || err.message.includes('file')));

    // Prevent infinite loop: Only try repair once per session boot
    const hasTriedRepair = sessionStorage.getItem('hos_db_repaired');

    if (isCorruption && !hasTriedRepair) {
        console.warn('Database corruption detected! Attempting auto-repair...');
        try {
            sessionStorage.setItem('hos_db_repaired', 'true');
            await db.delete();
            console.log('Database deleted successfully. Reloading...');
            window.location.reload();
        } catch (e) {
            console.error('Auto-repair failed:', e);
            alert('系统提示：数据库文件损坏。请手动前往设置->Safari->高级->网站数据，删除本站数据。');
        }
    } else if (hasTriedRepair) {
        console.warn('Database repair attempted but error persists. Manual clearing required.');
    }
});

