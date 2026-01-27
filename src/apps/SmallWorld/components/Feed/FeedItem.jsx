import React from 'react';
import FeedHeader from './FeedHeader';
import FeedBody from './FeedBody';
import FeedFooter from './FeedFooter';
import { useSmallWorld } from '../../data/SmallWorldContext';

const FeedItem = ({ post }) => {
    const { toggleLike } = useSmallWorld();

    return (
        <div className="sw-feed-card sw-animate-fade-in">
            {/* 1. Header */}
            <FeedHeader
                author={post.author}
                createdAt={post.createdAt}
                source={post.source}
            />

            {/* 2. Body (Original Content) */}
            <FeedBody
                content={post.content}
                images={post.isRepost ? [] : post.images}
            />

            {/* 3. Repost (Nested Card) Logic */}
            {post.isRepost && post.originalPost && (
                <div className="sw-repost-card">
                    <div className="text-[14px] leading-relaxed">
                        <span className="sw-repost-author">
                            @{post.originalPost.author.name || post.originalPost.author.handle}
                        </span>
                        <span className="sw-repost-content">：{post.originalPost.content}</span>
                    </div>
                    {/* Nested Images */}
                    {post.originalPost.images && post.originalPost.images.length > 0 && (
                        <FeedBody content="" images={post.originalPost.images} isRepost={true} />
                    )}
                </div>
            )}

            {/* 3.1 Deleted Repost Handling */}
            {post.isRepost && !post.originalPost && (
                <div className="sw-repost-card text-gray-500 text-sm text-center py-6">
                    抱歉，此微博已被作者删除。
                </div>
            )}

            {/* 4. Footer Actions */}
            <FeedFooter
                stats={post.stats}
                isLiked={post.isLiked}
                onLike={() => toggleLike(post.id)}
            />
        </div>
    );
};

export default FeedItem;
