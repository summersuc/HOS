import React from 'react';
import { Heart, MessageCircle, Repeat, Share } from 'lucide-react';
import { useSmallWorld } from '../../data/SmallWorldContext';

const Post = ({ post }) => {
    const { users, toggleLike } = useSmallWorld();
    const author = users[post.authorId] || { name: 'Unknown', handle: '@unknown', avatar: '' };

    const formatTime = (timestamp) => {
        const diff = Date.now() - timestamp;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="p-4 border-b border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="flex gap-3">
                <img
                    src={author.avatar}
                    alt={author.name}
                    className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 object-cover"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className="font-bold text-gray-900 dark:text-white hover:underline">{author.name}</span>
                        <span className="text-sm text-gray-500">{author.handle}</span>
                        <span className="text-sm text-gray-500">·</span>
                        <span className="text-sm text-gray-500 hover:text-gray-400">{formatTime(post.timestamp)}</span>
                    </div>

                    <p className="mt-1 text-[15px] leading-normal text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                        {post.content}
                    </p>

                    {post.images && post.images.length > 0 && (
                        <div className={`mt-3 grid gap-2 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {post.images.map((img, i) => (
                                <img key={i} src={img} alt="" className="rounded-xl border border-gray-200 dark:border-white/10 w-full h-full object-cover max-h-[300px]" />
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between mt-3 max-w-[425px] text-gray-500">
                        <button className="flex items-center gap-1 hover:text-blue-500 group/action max-sm:gap-0 transition-colors">
                            <div className="p-2 rounded-full group-hover/action:bg-blue-500/10 transition-colors">
                                <MessageCircle size={18} />
                            </div>
                            <span className="text-xs">{post.stats.replies || ''}</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-green-500 group/action max-sm:gap-0 transition-colors">
                            <div className="p-2 rounded-full group-hover/action:bg-green-500/10 transition-colors">
                                <Repeat size={18} />
                            </div>
                            <span className="text-xs">{post.stats.reposts || ''}</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}
                            className={`flex items-center gap-1 group/action max-sm:gap-0 transition-colors ${post.isLiked ? 'text-pink-600' : 'hover:text-pink-600'}`}
                        >
                            <div className="p-2 rounded-full group-hover/action:bg-pink-500/10 transition-colors">
                                <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} />
                            </div>
                            <span className="text-xs">{post.stats.likes || ''}</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-blue-500 group/action max-sm:gap-0 transition-colors">
                            <div className="p-2 rounded-full group-hover/action:bg-blue-500/10 transition-colors">
                                <Share size={18} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Post;
