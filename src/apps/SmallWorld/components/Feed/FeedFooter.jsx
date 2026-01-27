import React, { useState } from 'react';
import { Repeat2, MessageCircle, Heart } from 'lucide-react';

// 格式化数字 (1000 -> 1k)
const formatCount = (num) => {
    if (!num || num === 0) return '';
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
};

const FeedFooter = ({ stats, isLiked, onLike, onRepost, onComment }) => {
    const [liked, setLiked] = useState(isLiked);
    const [likeCount, setLikeCount] = useState(stats.likes || 0);

    const handleLike = () => {
        if (!liked) {
            setLiked(true);
            setLikeCount(prev => prev + 1);
        } else {
            setLiked(false);
            setLikeCount(prev => Math.max(0, prev - 1));
        }
        onLike?.();
    };

    return (
        <div className="sw-feed-footer">
            {/* 转发 */}
            <button
                onClick={onRepost}
                className="sw-action-btn"
            >
                <Repeat2 size={18} strokeWidth={1.5} />
                <span>{formatCount(stats.reposts) || '转发'}</span>
            </button>

            <div className="sw-action-divider" />

            {/* 评论 */}
            <button
                onClick={onComment}
                className="sw-action-btn"
            >
                <MessageCircle size={18} strokeWidth={1.5} />
                <span>{formatCount(stats.comments) || '评论'}</span>
            </button>

            <div className="sw-action-divider" />

            {/* 点赞 */}
            <button
                onClick={handleLike}
                className={`sw-action-btn ${liked ? 'liked' : ''}`}
            >
                <Heart
                    size={18}
                    strokeWidth={liked ? 0 : 1.5}
                    fill={liked ? 'currentColor' : 'none'}
                />
                <span>{formatCount(likeCount) || '赞'}</span>
            </button>
        </div>
    );
};

export default FeedFooter;
