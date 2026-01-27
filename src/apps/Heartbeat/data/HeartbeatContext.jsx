import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';

// 创建 Context
const HeartbeatContext = createContext(null);

// 预设场景
export const PRESET_SCENES = [
    { id: 'cafe', name: '咖啡馆', icon: '☕', description: '温馨的咖啡馆，阳光透过落地窗洒进来，空气中弥漫着咖啡的香气...' },
    { id: 'beach', name: '海边', icon: '🌊', description: '傍晚的海滩，潮水轻拍沙滩，海风带着咸湿的气息，夕阳将天空染成橙红色...' },
    { id: 'home', name: '家中', icon: '🏠', description: '温馨的小窝，柔和的灯光营造出浪漫的氛围，窗外是城市的霓虹...' },
    { id: 'park', name: '公园', icon: '🌸', description: '阳光明媚的午后，樱花树下的长椅，花瓣随风飘落...' },
    { id: 'movie', name: '电影院', icon: '🎬', description: '昏暗的放映厅，银幕的光芒忽明忽暗，两人并肩坐着...' },
    { id: 'rain', name: '雨夜', icon: '🌧️', description: '窗外下着雨，雨声滴答作响，室内温暖而安静...' },
    { id: 'restaurant', name: '餐厅', icon: '🍽️', description: '烛光晚餐，轻柔的音乐在耳边流淌，美食与美酒...' },
    { id: 'starry', name: '星空', icon: '⭐', description: '夜晚的天台，繁星点点，两人依偎在一起仰望星空...' },
];

// 默认心动设置
const DEFAULT_SETTINGS = {
    displayMode: 'story', // story | bubble | immersive
    charPerspective: 'third', // first | third (角色自称：第一人称"我" / 第三人称"人物名字")
    userPerspective: 'second', // second | third (称呼用户：第二人称"你" / 第三人称"你的名字")
    outputLength: 500, // 默认改为 500
    historyLimit: 20, // 默认读取最近20条记录
    soundEffect: false,
    typewriterEffect: true,
    autoConversation: false,
    // 个性化颜色配置
    colors: {
        primary: '#FF6B8A', // 主题色
        action: '#FF8C69',  // 动作
        thought: '#888888', // 心理
        text: '#333333',    // 正文
    }
};

// Provider 组件
export const HeartbeatProvider = ({ children }) => {
    const [currentLoverId, setCurrentLoverId] = useState(null);
    const [currentPage, setCurrentPage] = useState('list'); // list | story | editor | settings

    // 初始化时尝试从 localStorage 读取
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('hb_settings');
            const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
            // 确保都有默认值 (兼容旧数据)
            return { ...DEFAULT_SETTINGS, ...parsed, colors: { ...DEFAULT_SETTINGS.colors, ...parsed.colors } };
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    });

    // 监听 settings 变化并保存
    useEffect(() => {
        localStorage.setItem('hb_settings', JSON.stringify(settings));

        // 动态应用颜色变量
        if (settings.colors) {
            const root = document.documentElement;
            root.style.setProperty('--hb-primary', settings.colors.primary);
            root.style.setProperty('--hb-action', settings.colors.action);
            root.style.setProperty('--hb-thought', settings.colors.thought);
            root.style.setProperty('--hb-text', settings.colors.text);
        }
    }, [settings]);

    const [isTyping, setIsTyping] = useState(false);

    // 从数据库实时查询恋人列表
    const lovers = useLiveQuery(() => db.lovers?.toArray() || [], []);

    // 查询当前恋人
    const currentLover = useLiveQuery(
        () => currentLoverId ? db.lovers?.get(currentLoverId) : null,
        [currentLoverId]
    );

    // 查询当前恋人的故事记录
    const stories = useLiveQuery(
        () => currentLoverId
            ? db.heartbeatStories?.where('loverId').equals(currentLoverId).sortBy('timestamp')
            : [],
        [currentLoverId]
    );

    // 创建新恋人
    const createLover = async (loverData) => {
        const id = await db.lovers.add({
            ...loverData,
            intimacy: 30, // 初始亲密度
            currentScene: loverData.defaultScene || 'cafe',
            createdAt: Date.now()
        });

        // 如果有开场白，自动添加第一条消息
        if (loverData.firstMessage) {
            await db.heartbeatStories.add({
                loverId: id,
                content: loverData.firstMessage,
                role: 'assistant',
                sceneId: loverData.defaultScene || 'cafe',
                metadata: { isFirstMessage: true },
                timestamp: Date.now()
            });
        }

        return id;
    };

    // 更新恋人信息
    const updateLover = async (id, updates) => {
        await db.lovers.update(id, updates);
    };

    // 删除恋人
    const deleteLover = async (id) => {
        await db.lovers.delete(id);
        // 同时删除相关故事记录
        await db.heartbeatStories.where('loverId').equals(id).delete();
        await db.heartbeatScenes.where('loverId').equals(id).delete();
    };

    // 添加故事记录
    const addStory = async (content, role = 'assistant', metadata = {}) => {
        if (!currentLoverId) return;

        await db.heartbeatStories.add({
            loverId: currentLoverId,
            content,
            role, // 'user' | 'assistant' | 'system'
            sceneId: currentLover?.currentScene || 'cafe',
            metadata,
            timestamp: Date.now()
        });
    };

    // 切换场景
    const switchScene = async (sceneId) => {
        if (!currentLoverId) return;

        await db.lovers.update(currentLoverId, { currentScene: sceneId });

        // 记录场景切换
        const scene = PRESET_SCENES.find(s => s.id === sceneId);
        if (scene) {
            await addStory(`[场景切换] ${scene.description}`, 'system');
        }
    };

    // 调整亲密度
    const adjustIntimacy = async (change) => {
        if (!currentLoverId || !currentLover) return;

        const newIntimacy = Math.max(0, Math.min(100, (currentLover.intimacy || 0) + change));
        await db.lovers.update(currentLoverId, { intimacy: newIntimacy });
    };

    // 撤回/删除指定时间戳及之后的故事记录
    const deleteStoriesAfter = async (timestamp) => {
        if (!currentLoverId) return;

        const storiesToDelete = await db.heartbeatStories
            .where('loverId').equals(currentLoverId)
            .and(story => story.timestamp >= timestamp)
            .toArray();

        const ids = storiesToDelete.map(s => s.id);
        if (ids.length > 0) {
            await db.heartbeatStories.bulkDelete(ids);
        }
    };

    // 从 Messenger 角色导入（API方法，非Editor使用）
    const importFromMessenger = async (characterId) => {
        const character = await db.characters?.get(characterId);
        if (!character) return null;

        const loverId = await createLover({
            name: character.name,
            avatar: character.avatar,
            personality: character.personality || '',
            description: character.description || '', // 导入详细设定
            firstMessage: character.firstMessage || '', // 导入开场白
            relationship: character.relationship || '恋人',
            appearance: '', // 需要额外填写
            userNickname: '你', // 默认称呼
            defaultScene: 'cafe'
        });

        return loverId;
    };

    const value = {
        // 状态
        lovers,
        currentLover,
        currentLoverId,
        currentPage,
        stories,
        settings,
        isTyping,

        // 导航
        setCurrentLoverId,
        setCurrentPage,

        // 操作
        createLover,
        updateLover,
        deleteLover,
        addStory,
        switchScene,
        adjustIntimacy,
        deleteStoriesAfter,
        importFromMessenger,

        // 设置
        setSettings,
        setIsTyping,

        // 常量
        PRESET_SCENES,
    };

    return (
        <HeartbeatContext.Provider value={value}>
            {children}
        </HeartbeatContext.Provider>
    );
};

// Hook
export const useHeartbeat = () => {
    const context = useContext(HeartbeatContext);
    if (!context) {
        throw new Error('useHeartbeat must be used within HeartbeatProvider');
    }
    return context;
};

export default HeartbeatContext;
