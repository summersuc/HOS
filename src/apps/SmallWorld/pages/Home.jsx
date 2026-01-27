import React from 'react';
import { useSmallWorld } from '../data/SmallWorldContext';
import FeedItem from '../components/Feed/FeedItem';
import { FileText } from 'lucide-react';

const Home = () => {
    const { posts } = useSmallWorld();

    return (
        <div className="min-h-full">
            {/* Feed列表 */}
            <div className="bg-[#F2F2F2] dark:bg-black min-h-screen">
                {posts.length > 0 ? (
                    posts.map(post => (
                        <FeedItem key={post.id} post={post} />
                    ))
                ) : (
                    <div className="sw-empty-state bg-white dark:bg-[#1C1C1E] mx-0 mt-0">
                        <svg className="sw-empty-icon" viewBox="0 0 100 100" fill="currentColor">
                            <rect x="15" y="20" width="70" height="8" rx="4" opacity="0.2" />
                            <rect x="15" y="35" width="55" height="6" rx="3" opacity="0.15" />
                            <rect x="15" y="48" width="45" height="6" rx="3" opacity="0.15" />
                            <circle cx="30" cy="75" r="12" opacity="0.2" />
                            <circle cx="55" cy="75" r="12" opacity="0.2" />
                            <circle cx="80" cy="75" r="12" opacity="0.2" />
                        </svg>
                        <p className="sw-empty-text">
                            暂无关注内容<br />
                            <span className="text-[13px] opacity-70">去发现页看看有趣的人吧</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
