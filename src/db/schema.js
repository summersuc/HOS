import Dexie from 'dexie';

export const db = new Dexie('suki_pro');

// Handle upgrade blocking
db.on('versionchange', function (event) {
    db.close();
    window.location.reload();
});

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
    userPersonas: '++id, name, userName, avatar, isActive, createdAt',
    // 额外字段: description

    // Prompt 预设模板
    promptPresets: '++id, name, isActive, createdAt',
    // 额外字段: template (JSON array of sections)

    // 对话 (关联角色+人设)
    conversations: '++id, characterId, userPersonaId, title, updatedAt',

    // 消息 (支持分支)
    // 额外字段: content, branchIndex
});

// 数据库版本 5: 聊天富媒体支持 (Rich Media)
db.version(5).stores({
    // 升级 messages 表结构 (向后兼容)
    messengerMessages: '++id, [conversationType+conversationId], role, timestamp'
    // New fields: msgType (text, image, gift, transfer, redpacket), metadata (json object)
});

// 数据库版本 6: 角色关系与世界书 (Phase 2.5)
db.version(6).stores({
    characters: '++id, name, avatar, description, personality, relationship, createdAt'
});

// 数据库版本 8: 聊天设置增强 (No Punctuation)
db.version(8).stores({
    conversations: '++id, characterId, title, historyLimit, replyCount, noPunctuation, updatedAt'
});

// 数据库版本 9: 增加表情包 (Stickers)
db.version(9).stores({
    stickers: '++id, name, url, createdAt'
});

// 数据库版本 10: 聊天美化 (Wallpapers & Status)
db.version(10).stores({
    // Store wallpapers individually per conversation (blob or url)
    conversations: '++id, characterId, userPersonaId, title, wallpaper, historyLimit, replyCount, noPunctuation, updatedAt',
    // Add status field to characters
    characters: '++id, name, avatar, description, personality, relationship, currentStatus, isFavorite, createdAt'
});

// 数据库版本 11: 独立壁纸存储 (Blob Storage)
db.version(11).stores({
    chatWallpapers: 'id, data, createdAt'
});

// 数据库版本 12: 时区支持 + 世界书增强 + max_tokens
db.version(12).stores({
    // 用户人设增加时区
    userPersonas: '++id, name, userName, avatar, timezone, isActive, createdAt',
    // 角色增加时区
    characters: '++id, name, avatar, description, personality, relationship, timezone, currentStatus, isFavorite, createdAt',
    // 世界书增加全局/角色绑定
    worldBookEntries: '++id, title, keywords, isGlobal, characterId, injectionPosition, enabled, createdAt',
    // 对话增加 maxTokens
    conversations: '++id, characterId, userPersonaId, title, wallpaper, historyLimit, replyCount, maxTokens, noPunctuation, avatarMode, updatedAt'
});

// 数据库版本 13: 双语沟通支持
db.version(13).stores({
    conversations: '++id, characterId, userPersonaId, title, wallpaper, historyLimit, replyCount, maxTokens, noPunctuation, avatarMode, translationMode, updatedAt'
});

// 数据库版本 14: 通用 Blob 存储 (Fix iOS Crash)
db.version(14).stores({
    blobs: 'id, data, mimeType, createdAt'
});

// 数据库版本 15: 心动 App (Heartbeat - 沉浸式角色扮演)
db.version(15).stores({
    // 恋人表 (独立于 characters，但可从中导入)
    lovers: '++id, name, avatar, appearance, personality, relationship, intimacy, currentScene, createdAt',
    // 额外字段: userNickname, defaultScene, settings (json)

    // 故事记录表 (替代 messengerMessages)
    heartbeatStories: '++id, loverId, role, sceneId, timestamp',
    // 额外字段: content, metadata

    // 场景记忆表
    heartbeatScenes: '++id, loverId, sceneName, description, lastUsed'
});

// 数据库版本 16: 心动 App 字段补全
db.version(16).stores({
    lovers: '++id, name, avatar, appearance, personality, relationship, description, firstMessage, intimacy, currentScene, createdAt'
});

// 数据库版本 17: 修复 Heartbeat 索引 (sourceCharacterId)
db.version(17).stores({
    lovers: '++id, sourceCharacterId, name, avatar, appearance, personality, relationship, description, firstMessage, intimacy, currentScene, createdAt'
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
