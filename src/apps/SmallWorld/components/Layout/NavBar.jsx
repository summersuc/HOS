import React, { useState } from 'react';
import { Search, Bell, MoreHorizontal } from 'lucide-react';

const NavBar = ({ activeTab }) => {
    const [homeTab, setHomeTab] = useState('follow');

    // 首页顶部Tab配置
    const homeTabs = [
        { id: 'follow', label: '关注' },
        { id: 'recommend', label: '推荐' },
        { id: 'hot', label: '热门' }
    ];

    return (
        <div className="sw-navbar flex-shrink-0 sticky top-0 z-50 px-4 flex items-end justify-between select-none h-[calc(44px+env(safe-area-inset-top))]">
            <div className="w-full flex items-center justify-between h-[44px]">

                {/* 首页 - 三Tab切换 */}
                {activeTab === 'home' && (
                    <>
                        {/* 左侧通知图标 */}
                        <button className="w-8 flex justify-start text-gray-600 dark:text-gray-300 active:scale-90 transition-transform">
                            <Bell size={22} strokeWidth={1.8} />
                        </button>

                        {/* 中间Tab切换 */}
                        <div className="flex items-center gap-1">
                            {homeTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setHomeTab(tab.id)}
                                    className={`sw-nav-tab ${homeTab === tab.id ? 'active' : ''}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* 右侧搜索图标 */}
                        <button className="w-8 flex justify-end text-gray-600 dark:text-gray-300 active:scale-90 transition-transform">
                            <Search size={22} strokeWidth={1.8} />
                        </button>
                    </>
                )}

                {/* 发现页 - 搜索框 */}
                {activeTab === 'discover' && (
                    <div className="flex-1 bg-gray-100 dark:bg-white/10 h-9 rounded-full flex items-center px-4 gap-2">
                        <Search size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-400">发现新鲜事</span>
                    </div>
                )}

                {/* 消息页 - 居中标题 */}
                {activeTab === 'message' && (
                    <>
                        <div className="w-8" />
                        <div className="font-bold text-[17px] text-gray-900 dark:text-white">消息</div>
                        <button className="w-8 flex justify-end text-gray-600 dark:text-gray-300">
                            <MoreHorizontal size={22} strokeWidth={1.8} />
                        </button>
                    </>
                )}

                {/* 个人页 - 隐藏（Profile自带Header） */}
                {activeTab === 'profile' && null}
            </div>
        </div>
    );
};

export default NavBar;
