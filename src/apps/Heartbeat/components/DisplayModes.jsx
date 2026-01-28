import React from 'react';
import { renderStoryText } from '../utils/textFormatter';
import { storageService } from '../../../services/StorageService';

/**
 * 获取头像URL（支持idb引用）
 */
const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (typeof avatar === 'string' && avatar.startsWith('idb:')) {
        return storageService.getCachedBlobUrl(avatar) || avatar;
    }
    return avatar;
};

/**
 * 阅读模式视图 - SillyTavern 风格
 * 每条消息显示头像、楼层号、发送时间
 */
export const StoryView = ({ stories, streamingContent, isTyping, currentScene, loverName, loverAvatar, userAvatar, contentRef, onScroll, settings }) => {
    const loverAvatarUrl = getAvatarUrl(loverAvatar);
    const userAvatarUrl = getAvatarUrl(userAvatar);

    // 格式化时间
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    return (
        <div
            className="hb-story-view"
            ref={contentRef}
            onScroll={onScroll}
        >
            {/* 故事记录 */}
            {stories?.map((story, index) => {
                const isUser = story.role === 'user';
                const avatarUrl = isUser ? userAvatarUrl : loverAvatarUrl;
                const senderName = isUser ? '你' : (loverName || '角色');
                const floorNumber = index + 1;

                return (
                    <div
                        key={story.id || index}
                        className={`hb-st-message ${isUser ? 'hb-st-message-user' : ''}`}
                    >
                        {/* 消息头部 */}
                        <div className="hb-st-header">
                            <div className="hb-st-avatar">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={senderName} />
                                ) : (
                                    <span>{isUser ? '👤' : (loverName?.[0] || '💕')}</span>
                                )}
                            </div>
                            <span className="hb-st-name">{senderName}</span>
                            <span className="hb-st-floor">#{floorNumber}</span>
                            <span className="hb-st-time">{formatTime(story.timestamp)}</span>
                        </div>
                        {/* 消息内容 */}
                        <div
                            className="hb-st-content"
                            dangerouslySetInnerHTML={{ __html: renderStoryText(story.content || '') }}
                        />
                    </div>
                );
            })}

            {/* 流式输出 */}
            {streamingContent && (
                <div className="hb-st-message">
                    <div className="hb-st-header">
                        <div className="hb-st-avatar">
                            {loverAvatarUrl ? (
                                <img src={loverAvatarUrl} alt={loverName} />
                            ) : (
                                <span>{loverName?.[0] || '💕'}</span>
                            )}
                        </div>
                        <span className="hb-st-name">{loverName || '角色'}</span>
                        <span className="hb-st-floor">#{(stories?.length || 0) + 1}</span>
                        <span className="hb-st-time">正在输入...</span>
                    </div>
                    <div
                        className="hb-st-content"
                        dangerouslySetInnerHTML={{ __html: renderStoryText(streamingContent) }}
                    />
                </div>
            )}

            {/* 打字指示器 */}
            {isTyping && !streamingContent && (
                <div className="hb-st-typing">
                    <div className="hb-st-avatar">
                        {loverAvatarUrl ? (
                            <img src={loverAvatarUrl} alt={loverName} />
                        ) : (
                            <span>{loverName?.[0] || '💕'}</span>
                        )}
                    </div>
                    <span className="hb-st-typing-text">{loverName || '角色'} 正在输入</span>
                    <div className="hb-typing-dot"></div>
                    <div className="hb-typing-dot"></div>
                    <div className="hb-typing-dot"></div>
                </div>
            )}

            {/* 空状态提示 */}
            {(!stories || stories.length === 0) && !isTyping && (
                <div className="hb-empty-state">
                    <div className="hb-empty-icon">💬</div>
                    <div className="hb-empty-desc">开始你们的故事吧...</div>
                </div>
            )}

            {/* 底部强制占位符，防止内容被悬浮输入栏遮挡 */}
            <div style={{ height: '70px', width: '100%', flexShrink: 0 }} />
        </div>
    );
};

/**
 * 气泡模式视图 - 像聊天App一样的对话气泡
 * 磨砂玻璃特效，双方都显示头像
 */
export const BubbleView = ({ stories, streamingContent, isTyping, currentScene, loverName, loverAvatar, userAvatar, contentRef, onScroll, settings }) => {
    const loverAvatarUrl = getAvatarUrl(loverAvatar);
    const userAvatarUrl = getAvatarUrl(userAvatar);

    const renderAvatar = (isUser) => {
        const avatarUrl = isUser ? userAvatarUrl : loverAvatarUrl;
        const name = isUser ? '你' : loverName;

        return (
            <div className="hb-bubble-avatar">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={name} />
                ) : (
                    <span className="hb-bubble-avatar-placeholder">
                        {isUser ? '👤' : (loverName?.[0] || '💕')}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div
            className="hb-bubble-view"
            ref={contentRef}
            onScroll={onScroll}
        >
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
                        {/* 左侧头像（AI） */}
                        {!isUser && renderAvatar(false)}

                        {/* 气泡内容 */}
                        <div className={`hb-bubble ${isUser ? 'hb-bubble-user' : 'hb-bubble-lover'}`}>
                            <div
                                className="hb-bubble-content"
                                dangerouslySetInnerHTML={{ __html: renderStoryText(story.content) }}
                            />
                        </div>

                        {/* 右侧头像（用户） */}
                        {isUser && renderAvatar(true)}
                    </div>
                );
            })}

            {/* 流式输出 */}
            {streamingContent && (
                <div className="hb-bubble-row">
                    {renderAvatar(false)}
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
                    {renderAvatar(false)}
                    <div className="hb-bubble hb-bubble-lover hb-bubble-typing">
                        <div className="hb-typing-dot"></div>
                        <div className="hb-typing-dot"></div>
                        <div className="hb-typing-dot"></div>
                    </div>
                </div>
            )}

            {/* 空状态 */}
            {(!stories || stories.length === 0) && !isTyping && (
                <div className="hb-empty-state">
                    <div className="hb-empty-icon">💬</div>
                    <div className="hb-empty-desc">和 {loverName || '恋人'} 开始聊天吧...</div>
                </div>
            )}
        </div>
    );
};

/**
 * 沉浸模式视图 - 全屏沉浸式阅读体验
 * 可向上滚动查看历史消息，最新内容居中大字显示
 */
export const ImmersiveView = ({ stories, streamingContent, isTyping, currentScene, loverName, contentRef, onScroll, settings }) => {
    return (
        <div
            className="hb-immersive-view"
            ref={contentRef}
            onScroll={onScroll}
        >
            {/* 场景背景层 */}
            <div className="hb-immersive-bg">
                <div className="hb-immersive-scene-icon">{currentScene?.icon || '💕'}</div>
                <div className="hb-immersive-scene-name">{currentScene?.name || '约会中'}</div>
            </div>

            {/* 历史消息（可滚动） */}
            <div className="hb-immersive-history">
                {stories?.map((story, index) => (
                    <div
                        key={story.id || index}
                        className={`hb-immersive-message ${story.role === 'user' ? 'hb-immersive-message-user' : ''} ${story.role === 'system' ? 'hb-immersive-message-system' : ''}`}
                    >
                        <div
                            className="hb-immersive-text"
                            dangerouslySetInnerHTML={{ __html: renderStoryText(story.content) }}
                        />
                    </div>
                ))}

                {/* 流式输出 */}
                {streamingContent && (
                    <div className="hb-immersive-message">
                        <div
                            className="hb-immersive-text"
                            dangerouslySetInnerHTML={{ __html: renderStoryText(streamingContent) }}
                        />
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

                {/* 空状态 */}
                {(!stories || stories.length === 0) && !isTyping && (
                    <div className="hb-immersive-empty">
                        <div className="hb-immersive-empty-icon">💕</div>
                        <div className="hb-immersive-empty-text">
                            {currentScene?.description || '开始你们的故事...'}
                        </div>
                    </div>
                )}
            </div>

            {/* 底部渐变遮罩 */}
            <div className="hb-immersive-gradient"></div>
        </div>
    );
};

export default { StoryView, BubbleView, ImmersiveView };
