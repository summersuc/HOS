import React, { useState, useRef, useEffect, useCallback } from 'react';
import { db } from '../../../db/schema';
import { MapPin, Send, Bug, RotateCcw } from 'lucide-react';
import { useHeartbeat, PRESET_SCENES } from '../data/HeartbeatContext';
import { renderStoryText, extractPlainText } from '../utils/textFormatter';
import { buildSystemPrompt, buildContext } from '../data/promptTemplates';
import { llmService as LLMService } from '../../../services/LLMService';
import { StoryView, BubbleView, ImmersiveView } from '../components/DisplayModes';
import DebugLogModal from '../../Messenger/components/DebugLogModal';
import { useTypewriter } from '../hooks/useTypewriter';

/**
 * 角色扮演主场景 - 支持多种显示模式
 * 优化：智能滚动、统一输入框、打字机效果
 */
const StoryScene = (props) => {
    const hbContext = useHeartbeat() || {};
    const {
        currentLover: contextLover,
        currentLoverId: contextLoverId,
        stories: contextStories,
        settings: contextSettings,
        isTyping: contextIsTyping,
        setIsTyping: contextSetIsTyping,
        setCurrentPage: contextSetPage,
        addStory: contextAddStory,
        switchScene: contextSwitchScene,
        adjustIntimacy: contextAdjustIntimacy,
        deleteStoriesAfter: contextDeleteStories,
    } = hbContext;

    // 优先使用 props 传入的值，作为 Context 丢失时的兜底
    const currentLover = props.currentLover || contextLover;
    const currentLoverId = props.currentLoverId || contextLoverId;
    const stories = props.stories || contextStories;
    const settings = props.settings || contextSettings || {};
    const isTyping = props.isTyping !== undefined ? props.isTyping : contextIsTyping;
    const setIsTyping = props.setIsTyping || contextSetIsTyping;
    const setCurrentPage = props.setCurrentPage || contextSetPage;
    const addStory = props.addStory || contextAddStory;
    const switchScene = props.switchScene || contextSwitchScene;
    const adjustIntimacy = props.adjustIntimacy || contextAdjustIntimacy;
    const deleteStoriesAfter = props.deleteStoriesAfter || contextDeleteStories;

    const [input, setInput] = useState('');
    const [showScenePicker, setShowScenePicker] = useState(false);
    const [rawStreamingContent, setRawStreamingContent] = useState('');
    const [showDebug, setShowDebug] = useState(false);
    const [debugInfo, setDebugInfo] = useState({ request: '', response: '' });
    const contentRef = useRef(null);
    const textareaRef = useRef(null);
    const isUserScrolledUpRef = useRef(false);

    // 打字机效果 Hook
    const displayedStreamingContent = useTypewriter(
        rawStreamingContent,
        settings.typewriterEffect,
        settings.typewriterSpeed || 25
    );

    // 获取当前场景 (支持自定义)
    const getScene = () => {
        const sceneId = currentLover?.currentScene;
        const preset = PRESET_SCENES.find(s => s.id === sceneId);

        if (preset) return preset;

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

    // 智能滚动：检测用户是否上滑
    const handleScroll = useCallback(() => {
        if (!contentRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        // 如果距离底部超过 100px，认为用户在往上看
        isUserScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 100;
    }, []);

    // 初次进入页面时强制滚动到最底部
    useEffect(() => {
        // 延迟执行确保DOM已渲染
        const timer = setTimeout(() => {
            if (contentRef.current) {
                contentRef.current.scrollTop = contentRef.current.scrollHeight;
                isUserScrolledUpRef.current = false;
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [currentLoverId]); // 切换角色时也重新滚动

    const shouldScrollToBottomRef = useRef(false);

    // 消息更新时，如果标记为需要滚动，则滚动到底部
    useEffect(() => {
        if (shouldScrollToBottomRef.current && contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
            shouldScrollToBottomRef.current = false;
        }
    }, [stories]);

    // 自动调整 textarea 高度
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    }, []);

    useEffect(() => {
        adjustTextareaHeight();
    }, [input, adjustTextareaHeight]);

    // 发送消息 - 直接发送原文，不再格式化
    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userInput = input.trim();
        setInput('');
        // 重置 textarea 高度
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        // 发送时标记需要滚动
        shouldScrollToBottomRef.current = true;
        isUserScrolledUpRef.current = false;

        // 直接保存用户原文，不再调用 formatUserInput
        await addStory(userInput, 'user');

        try {
            // 1. 获取 User Persona
            let userPersona = null;
            if (currentLover?.userPersonaId) {
                userPersona = await db.userPersonas.get(currentLover.userPersonaId);
            }

            // 2. 获取 World Book Entries
            const wbEntries = await db.worldBookEntries
                .filter(e => e.enabled !== false && (e.isGlobal || e.characterId === currentLoverId))
                .toArray();

            // 3. 构建 Prompt
            const systemPrompt = buildSystemPrompt(currentLover, currentScene, settings, userPersona, wbEntries);

            // 4. 获取历史记录
            const limit = settings.historyLimit || 20;
            const history = (stories || []).slice(-limit);

            // 5. 构建消息上下文
            const messages = buildContext(systemPrompt, history, userInput);

            // 记录 Debug Request
            setDebugInfo(prev => ({ ...prev, request: JSON.stringify(messages, null, 2) }));

            // 开始流式生成
            setIsTyping(true);
            setRawStreamingContent('');

            let fullContent = '';

            await new Promise((resolve, reject) => {
                LLMService.sendMessageStream(
                    messages,
                    (chunk) => {
                        fullContent += chunk;
                        setRawStreamingContent(fullContent);
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
            setRawStreamingContent('');
        }
    };

    // 切换场景
    const handleSceneSwitch = async (sceneId) => {
        await switchScene(sceneId);
        setShowScenePicker(false);
    };

    // 撤回编辑逻辑
    const handleEditLastMessage = async () => {
        const lastUserStory = [...stories].reverse().find(s => s.role === 'user');
        if (!lastUserStory) return;

        setInput(lastUserStory.content);
        await deleteStoriesAfter(lastUserStory.timestamp);
    };

    // 键盘事件处理 - 回车键正常换行，只有点击发送按钮才触发发送
    // （已移除 Enter 发送逻辑，用户可以自由分行输入）

    // 渲染内容区（根据显示模式）
    const renderContentView = () => {
        const viewProps = {
            stories,
            streamingContent: displayedStreamingContent,
            isTyping,
            currentScene,
            loverName: currentLover?.name,
            loverAvatar: currentLover?.avatar,
            userAvatar: null, // TODO: 从 userPersona 获取
            contentRef,
            onScroll: handleScroll,
            settings,
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

            {/* 内容区 */}
            {renderContentView()}

            {/* 悬浮输入面板 */}
            <div className="hb-floating-input">
                {/* 悬浮工具栏 (撤回/Debug) */}
                <div className="hb-floating-toolbar">
                    {stories?.length > 0 && !isTyping && (
                        <button
                            className="hb-toolbar-btn"
                            onClick={handleEditLastMessage}
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                    <button
                        className="hb-toolbar-btn"
                        onClick={() => setShowDebug(true)}
                    >
                        <Bug size={16} />
                    </button>
                </div>

                <div className="hb-input-wrapper">
                    <textarea
                        ref={textareaRef}
                        className="hb-input-field hb-textarea-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="输入内容..."
                        rows={1}
                    />
                    <button
                        className="hb-send-btn-inline"
                        onClick={handleSend}
                        disabled={isTyping || !input.trim()}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoryScene;
