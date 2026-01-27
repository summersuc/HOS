import React from 'react';
import { MoreHorizontal } from 'lucide-react';

const FeedHeader = ({ author, createdAt, source }) => {

    const formatTime = (timestamp) => {
        const diff = Date.now() - timestamp;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    };

    return (
        <div className="sw-feed-header">
            {/* Avatar */}
            <div className="sw-avatar-wrap">
                <img
                    src={author.avatar}
                    alt={author.name}
                    className="sw-avatar"
                />
                {/* V Badge - 可选 */}
                {author.verified && (
                    <div className="sw-v-badge">V</div>
                )}
            </div>

            {/* Info */}
            <div className="sw-user-info">
                <span className="sw-username">{author.name}</span>
                <div className="sw-meta">
                    <span>{formatTime(createdAt)}</span>
                    <span>·</span>
                    <span>来自 {source || 'Suki'}</span>
                </div>
            </div>

            {/* More Button */}
            <button className="sw-more-btn">
                <MoreHorizontal size={20} strokeWidth={1.5} />
            </button>
        </div>
    );
};

export default FeedHeader;
