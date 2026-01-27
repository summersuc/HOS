import React, { useState } from 'react';
import { useSmallWorld } from '../data/SmallWorldContext';
import FeedItem from '../components/Feed/FeedItem';
import { Settings, MoreHorizontal } from 'lucide-react';

const Profile = () => {
    const { currentUser, posts } = useSmallWorld();
    const [activeTab, setActiveTab] = useState('posts');

    // 过滤用户帖子
    const myPosts = posts.filter(p => p.author.name === currentUser.name);

    // Tab配置
    const tabs = [
        { id: 'home', label: '主页' },
        { id: 'posts', label: '微博' },
        { id: 'photos', label: '相册' }
    ];

    return (
        <div className="min-h-full bg-[#f2f2f2] dark:bg-black">
            {/* 1. 封面图 */}
            <div
                className="sw-profile-cover"
                style={{ backgroundImage: `url(${currentUser.coverImage})` }}
            >
                <div className="sw-cover-overlay" />

                {/* 顶部操作按钮 */}
                <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 pt-[calc(env(safe-area-inset-top)+8px)] z-20">
                    <button className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-sm">
                        <MoreHorizontal size={18} />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-sm">
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {/* 2. 个人信息区域 */}
            <div className="sw-profile-info">
                <div className="px-4">
                    {/* 头像 + 编辑按钮 */}
                    <div className="sw-profile-header">
                        <div className="sw-profile-avatar-wrap">
                            <img
                                src={currentUser.avatar}
                                className="sw-profile-avatar"
                                alt="avatar"
                            />
                        </div>
                        <button className="sw-edit-btn">
                            编辑资料
                        </button>
                    </div>

                    {/* 用户信息 */}
                    <div className="px-1">
                        <h1 className="sw-profile-name">{currentUser.name}</h1>

                        {/* 统计数据 */}
                        <div className="sw-profile-stats">
                            <div className="sw-stat-item">
                                <span className="sw-stat-num">{currentUser.stats.following}</span>
                                <span>关注</span>
                            </div>
                            <div className="sw-stat-item">
                                <span className="sw-stat-num">{currentUser.stats.followers}</span>
                                <span>粉丝</span>
                            </div>
                        </div>

                        {/* 简介 */}
                        <p className="sw-profile-bio">
                            {currentUser.bio || "这个人很懒，什么都没有留下~"}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Tab栏 */}
            <div className="sw-profile-tabs">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`sw-profile-tab ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. 内容区域 */}
            <div>
                {activeTab === 'posts' && (
                    <div className="space-y-0">
                        {myPosts.length > 0 ? (
                            myPosts.map(p => <FeedItem key={p.id} post={p} />)
                        ) : (
                            <div className="sw-empty-state bg-white dark:bg-[#1C1C1E]">
                                <svg className="sw-empty-icon" viewBox="0 0 100 100" fill="currentColor">
                                    <circle cx="50" cy="35" r="20" opacity="0.3" />
                                    <path d="M20 75 Q50 55 80 75 L80 90 L20 90 Z" opacity="0.3" />
                                </svg>
                                <p className="sw-empty-text">
                                    这里的世界静悄悄...<br />
                                    <span className="text-[13px] opacity-70">发一条微博记录生活吧</span>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'home' && (
                    <div className="sw-empty-state bg-white dark:bg-[#1C1C1E]">
                        <p className="sw-empty-text">主页内容开发中...</p>
                    </div>
                )}

                {activeTab === 'photos' && (
                    <div className="sw-empty-state bg-white dark:bg-[#1C1C1E]">
                        <p className="sw-empty-text">暂无相册内容</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
