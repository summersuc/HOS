import React from 'react';
import { renderStoryText } from '../utils/textFormatter';

/**
 * 阅读模式视图 - 像小说一样的连续文本流
 */
export const StoryView = ({ stories, streamingContent, isTyping, currentScene, loverName, contentRef }) => {
    return (
        <div className="hb-story-view" ref={contentRef}>
            {/* 故事记录 */}
            {stories?.map((story, index) => (
                <div
                    key={story.id || index}
                    className={`hb-message ${story.role === 'user' ? 'hb-message-user' : ''} ${story.role === 'system' ? 'hb-message-system' : ''}`}
                >
                    <div
                        className="hb-story-content"
                        dangerouslySetInnerHTML={{ __html: renderStoryText(story.content) }}
                    />
                </div>
            ))}

            {/* 流式输出 */}
            {streamingContent && (
                <div className="hb-message">
                    <div
                        className="hb-story-content"
                        dangerouslySetInnerHTML={{ __html: renderStoryText(streamingContent) }}
                    />
                </div>
            )}

            {/* 打字指示器 */}
            {isTyping && !streamingContent && (
                <div className="hb-typing">
                    <div className="hb-typing-dot"></div>
                    <div className="hb-typing-dot"></div>
                    <div className="hb-typing-dot"></div>
                </div>
            )}

            {/* 空状态提示 */}
            {(!stories || stories.length === 0) && !isTyping && (
                <div className="hb-empty-state" style={{ padding: '32px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                        {currentScene?.icon || '💕'}
                    </div>
                    <div style={{ color: '#888' }}>
                        {currentScene?.description || '温馨的氛围...'}
                    </div>
                    <div style={{ marginTop: '16px', color: '#FF6B8A' }}>
                        开始你们的故事吧...
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * 气泡模式视图 - 像聊天App一样的对话气泡
 */
export const BubbleView = ({ stories, streamingContent, isTyping, currentScene, loverName, loverAvatar, contentRef }) => {
    return (
        <div className="hb-bubble-view" ref={contentRef}>
            {/* 聊天记录 */}
            {stories?.map((story, index) => {
                // 系统消息特殊处理
                if (story.role === 'system') {
                    return (
                        <div key={story.id || index} className="hb-bubble-system">
                            <span className="hb-bubble-system-text">{story.content}</span>
                        </div>
                    );
                }

                const isUser = story.role === 'user';

                return (
                    <div
                        key={story.id || index}
                        className={`hb-bubble-row ${isUser ? 'hb-bubble-row-user' : ''}`}
                    >
                        {/* 头像（仅恋人侧） */}
                        {!isUser && (
                            <div className="hb-bubble-avatar">
                                {loverAvatar ? (
                                    <img src={loverAvatar} alt={loverName} />
                                ) : (
                                    <span>{loverName?.[0] || '💕'}</span>
                                )}
                            </div>
                        )}

                        {/* 气泡内容 */}
                        <div className={`hb-bubble ${isUser ? 'hb-bubble-user' : 'hb-bubble-lover'}`}>
                            <div
                                className="hb-bubble-content"
                                dangerouslySetInnerHTML={{ __html: renderStoryText(story.content) }}
                            />
                        </div>
                    </div>
                );
            })}

            {/* 流式输出 */}
            {streamingContent && (
                <div className="hb-bubble-row">
                    <div className="hb-bubble-avatar">
                        {loverAvatar ? (
                            <img src={loverAvatar} alt={loverName} />
                        ) : (
                            <span>{loverName?.[0] || '💕'}</span>
                        )}
                    </div>
                    <div className="hb-bubble hb-bubble-lover">
                        <div
                            className="hb-bubble-content"
                            dangerouslySetInnerHTML={{ __html: renderStoryText(streamingContent) }}
                        />
                    </div>
                </div>
            )}

            {/* 打字指示器 */}
            {isTyping && !streamingContent && (
                <div className="hb-bubble-row">
                    <div className="hb-bubble-avatar">
                        {loverAvatar ? (
                            <img src={loverAvatar} alt={loverName} />
                        ) : (
                            <span>{loverName?.[0] || '💕'}</span>
                        )}
                    </div>
                    <div className="hb-bubble hb-bubble-lover hb-bubble-typing">
                        <div className="hb-typing-dot"></div>
                        <div className="hb-typing-dot"></div>
                        <div className="hb-typing-dot"></div>
                    </div>
                </div>
            )}

            {/* 空状态 */}
            {(!stories || stories.length === 0) && !isTyping && (
                <div className="hb-empty-state" style={{ padding: '32px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                    <div style={{ color: '#888' }}>和 {loverName || '恋人'} 开始聊天吧...</div>
                </div>
            )}
        </div>
    );
};

/**
 * 沉浸模式视图 - 全屏沉浸式阅读体验
 */
export const ImmersiveView = ({ stories, streamingContent, isTyping, currentScene, loverName, contentRef }) => {
    // 只显示最近的内容（最新1-2条）
    const recentStories = stories?.slice(-2) || [];
    const displayContent = streamingContent || recentStories[recentStories.length - 1]?.content || '';

    return (
        <div className="hb-immersive-view" ref={contentRef}>
            {/* 场景背景层 */}
            <div className="hb-immersive-bg">
                <div className="hb-immersive-scene-icon">{currentScene?.icon || '💕'}</div>
                <div className="hb-immersive-scene-name">{currentScene?.name || '约会中'}</div>
            </div>

            {/* 内容层 - 居中显示 */}
            <div className="hb-immersive-content">
                {displayContent ? (
                    <div
                        className="hb-immersive-text"
                        dangerouslySetInnerHTML={{ __html: renderStoryText(displayContent) }}
                    />
                ) : (
                    <div className="hb-immersive-empty">
                        <div className="hb-immersive-empty-icon">💕</div>
                        <div className="hb-immersive-empty-text">
                            {currentScene?.description || '开始你们的故事...'}
                        </div>
                    </div>
                )}

                {/* 打字指示器 */}
                {isTyping && !streamingContent && (
                    <div className="hb-immersive-typing">
                        <span>{loverName || '她'} 正在...</span>
                        <div className="hb-typing-dot"></div>
                        <div className="hb-typing-dot"></div>
                        <div className="hb-typing-dot"></div>
                    </div>
                )}
            </div>

            {/* 底部渐变遮罩 */}
            <div className="hb-immersive-gradient"></div>
        </div>
    );
};

export default { StoryView, BubbleView, ImmersiveView };
