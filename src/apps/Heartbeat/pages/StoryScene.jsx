import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../../db/schema';
import { MapPin, Send, Settings, Bug, RotateCcw } from 'lucide-react';
import { useHeartbeat, PRESET_SCENES } from '../data/HeartbeatContext';
import { renderStoryText, extractPlainText } from '../utils/textFormatter';
import { buildSystemPrompt, buildContext, formatUserInput } from '../data/promptTemplates';
import { llmService as LLMService } from '../../../services/LLMService';
import { StoryView, BubbleView, ImmersiveView } from '../components/DisplayModes';
import DebugLogModal from '../../Messenger/components/DebugLogModal';

/**
 * 角色扮演主场景 - 支持多种显示模式
 */
const StoryScene = () => {
    const {
        currentLover,
        currentLoverId,
        stories,
        settings,
        isTyping,
        setIsTyping,
        setCurrentPage,
        addStory,
        switchScene,
        adjustIntimacy,
        deleteStoriesAfter,
    } = useHeartbeat();

    const [input, setInput] = useState('');
    const [showScenePicker, setShowScenePicker] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [showDebug, setShowDebug] = useState(false);
    const [debugInfo, setDebugInfo] = useState({ request: '', response: '' });
    const contentRef = useRef(null);

    // 获取当前场景 (支持自定义)
    const getScene = () => {
        const sceneId = currentLover?.currentScene;
        const preset = PRESET_SCENES.find(s => s.id === sceneId);

        if (preset) return preset;

        // 如果是自定义场景 (ID为 'custom' 或其他未定义ID但有自定义数据)
        if (sceneId === 'custom' || (!preset && currentLover?.customSceneName)) {
            return {
                id: 'custom',
                name: currentLover.customSceneName || '未知领域',
                icon: '✨',
                description: currentLover.customSceneDescription || '这里是一片未知的领域，一切皆有可能...'
            };
        }

        return PRESET_SCENES[0];
    };

    const currentScene = getScene();

    // 自动滚动到底部
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [stories, streamingContent]);

    // 发送消息
    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userInput = input.trim();
        setInput('');

        // 立即保存用户输入
        await addStory(formatUserInput(userInput), 'user');

        try {
            // 1. 获取 User Persona
            let userPersona = null;
            if (currentLover?.userPersonaId) {
                userPersona = await db.userPersonas.get(currentLover.userPersonaId);
            }

            // 2. 获取 World Book Entries (简单策略：获取全局 + 绑定当前角色的所有条目)
            const wbEntries = await db.worldBookEntries
                .filter(e => e.enabled !== false && (e.isGlobal || e.characterId === currentLoverId))
                .toArray();

            // 3. 构建 Prompt (增强版)
            const systemPrompt = buildSystemPrompt(currentLover, currentScene, settings, userPersona, wbEntries);

            // 4. 获取历史记录（由 Context 控制）
            const limit = settings.historyLimit || 20;
            const history = (stories || []).slice(-limit);

            // 5. 构建消息上下文
            const messages = buildContext(systemPrompt, history, userInput);

            // 记录 Debug Request
            setDebugInfo(prev => ({ ...prev, request: JSON.stringify(messages, null, 2) }));

            // 开始流式生成
            setIsTyping(true);
            setStreamingContent('');

            let fullContent = '';

            await new Promise((resolve, reject) => {
                LLMService.sendMessageStream(
                    messages,
                    (chunk) => {
                        fullContent += chunk;
                        setStreamingContent(fullContent);
                    },
                    () => resolve(),
                    (err) => reject(err)
                );
            });

            // 记录 Debug Response
            setDebugInfo(prev => ({ ...prev, response: fullContent }));

            // 保存 AI 回复
            await addStory(fullContent, 'assistant');

            // 增加亲密度
            adjustIntimacy(1);

        } catch (error) {
            console.error('AI Error:', error);
            const charName = currentLover?.name || '他';
            await addStory(`*${charName}似乎有些走神，没有回应你...*`, 'assistant');
        } finally {
            setIsTyping(false);
            setStreamingContent('');
        }
    };

    // 切换场景
    const handleSceneSwitch = async (sceneId) => {
        await switchScene(sceneId);
        setShowScenePicker(false);
    };

    // 快捷动作按钮
    const handleQuickAction = (type) => {
        switch (type) {
            case 'action':
                setInput(prev => `*${prev}*`);
                break;
            case 'dialogue':
                setInput(prev => `"${prev}"`);
                break;
            case 'thought':
                setInput(prev => `（${prev}）`);
                break;
        }
    };

    // 撤回编辑逻辑
    const handleEditLastMessage = async () => {
        // 找到最后一条用户消息
        const lastUserStory = [...stories].reverse().find(s => s.role === 'user');
        if (!lastUserStory) return;

        // 填充输入框 (移除可能的格式标记，或者直接填充原始内容)
        // 这里选择填充处理过的原始内容，去掉首尾的格式符号
        let content = lastUserStory.content;
        const plain = extractPlainText(content); // 需要从 textFormatter 导入，或者简单一点直接回填
        // 考虑到用户可能想保留格式，直接回填 content
        setInput(content);

        // 删除该消息及之后的所有消息
        await deleteStoriesAfter(lastUserStory.timestamp);
    };

    // 渲染内容区（根据显示模式）
    const renderContentView = () => {
        const viewProps = {
            stories,
            streamingContent,
            isTyping,
            currentScene,
            loverName: currentLover?.name,
            loverAvatar: currentLover?.avatar,
            contentRef: contentRef
        };

        switch (settings.displayMode) {
            case 'bubble':
                return <BubbleView {...viewProps} />;
            case 'immersive':
                return <ImmersiveView {...viewProps} />;
            case 'story':
            default:
                return <StoryView {...viewProps} />;
        }
    };

    const isImmersive = settings.displayMode === 'immersive';

    return (
        <div className={`hb-story-scene ${isImmersive ? 'hb-immersive-mode' : ''}`}>
            {/* Debug Modal */}
            <DebugLogModal
                isOpen={showDebug}
                onClose={() => setShowDebug(false)}
                request={debugInfo.request}
                response={debugInfo.response}
            />

            {/* 场景标签（非沉浸模式显示） */}
            {!isImmersive && (
                <div
                    className="hb-scene-badge"
                    onClick={() => setShowScenePicker(!showScenePicker)}
                    style={{ margin: '12px 16px 0' }}
                >
                    <MapPin size={14} />
                    {currentScene.icon} {currentScene.name}
                </div>
            )}

            {/* 场景选择器 */}
            {showScenePicker && (
                <div className="hb-scene-picker-dropdown">
                    {PRESET_SCENES.map(scene => (
                        <button
                            key={scene.id}
                            className={`hb-scene-option ${scene.id === currentLover?.currentScene ? 'active' : ''}`}
                            onClick={() => handleSceneSwitch(scene.id)}
                        >
                            <span className="hb-scene-icon">{scene.icon}</span>
                            <span className="hb-scene-name">{scene.name}</span>
                        </button>
                    ))}
                    {/* 如果有自定义场景记录，允许切换回去 */}
                    {currentLover?.customSceneName && (
                        <button
                            className={`hb-scene-option ${currentLover.currentScene === 'custom' ? 'active' : ''}`}
                            onClick={() => handleSceneSwitch('custom')}
                        >
                            <span className="hb-scene-icon">✨</span>
                            <span className="hb-scene-name">{currentLover.customSceneName}</span>
                        </button>
                    )}
                </div>
            )}

            {/* 内容区 */}
            {renderContentView()}

            {/* 输入面板 */}
            <div className={`hb-input-panel ${isImmersive ? 'hb-input-immersive' : ''}`}>
                <div className="hb-input-row">
                    <input
                        type="text"
                        className="hb-input-field"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="输入你的行动或对话..."
                    />
                    <button
                        className="hb-send-btn"
                        onClick={handleSend}
                        disabled={isTyping || !input.trim()}
                    >
                        <Send size={18} />
                    </button>
                </div>

                {/* 快捷动作 */}
                <div className="hb-quick-actions">
                    <button className="hb-quick-btn" onClick={() => handleQuickAction('action')}>🎭 动作</button>
                    <button className="hb-quick-btn" onClick={() => handleQuickAction('dialogue')}>💬 对话</button>
                    <button className="hb-quick-btn" onClick={() => handleQuickAction('thought')}>💭 内心</button>

                    {/* Debug 按钮 */}
                    <button
                        className="hb-quick-btn"
                        onClick={() => setShowDebug(true)}
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', color: '#999' }}
                    >
                        <Bug size={14} /> Debug
                    </button>

                    {/* 撤回编辑按钮 (当有历史记录且未在输入时显示) */}
                    {stories?.length > 0 && !isTyping && (
                        <button
                            className="hb-quick-btn"
                            onClick={handleEditLastMessage}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <RotateCcw size={14} /> 撤回编辑
                        </button>
                    )}

                    {isImmersive && (
                        <button className="hb-quick-btn" onClick={() => setShowScenePicker(!showScenePicker)}>
                            {currentScene.icon} 场景
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryScene;
