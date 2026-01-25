import React, { useState } from 'react';
import { SmallWorldProvider } from './data/SmallWorldContext';
import Sidebar from './components/Layout/Sidebar';
import FeedList from './components/Feed/FeedList';
import CreatePost from './components/Composer/CreatePost';
import Profile from './pages/Profile';
import IOSPage from '../../components/AppWindow/IOSPage';
import './styles/SmallWorld.css';

// Simple Header Component
const Header = ({ title }) => (
    <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10 px-4 py-3 cursor-pointer pt-[calc(env(safe-area-inset-top)+12px)]">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
);

const SmallWorldApp = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('home');

    return (
        <SmallWorldProvider>
            <IOSPage title={null} onBack={onClose} enableEnterAnimation={false} showBackButton={false}>
                <div className="small-world-app w-full h-full bg-[#F2F2F7] dark:bg-black text-gray-900 dark:text-white flex overflow-hidden font-sans select-none">
                    {/* Sidebar Navigation */}
                    <header className="flex-shrink-0 z-20 hidden md:block border-r border-gray-200 dark:border-white/10 bg-[#F2F2F7] dark:bg-black">
                        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
                    </header>

                    {/* Main Content Area */}
                    <main className="flex-1 w-full flex relative divide-x divide-gray-200 dark:divide-white/10 bg-white dark:bg-black">
                        {/* Feed Column */}
                        <div className="flex-1 max-w-[600px] w-full hide-scrollbar overflow-y-auto bg-white dark:bg-black">
                            {activeTab === 'home' && (
                                <>
                                    <Header title="主页" />
                                    <CreatePost />
                                    <FeedList />
                                </>
                            )}
                            {activeTab === 'profile' && (
                                <Profile onBack={() => setActiveTab('home')} />
                            )}
                            {activeTab === 'explore' && (
                                <>
                                    <Header title="探索" />
                                    <div className="p-10 text-center text-gray-500 bg-white dark:bg-black">
                                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">探索</h2>
                                        <p>这里将显示热门话题。</p>
                                    </div>
                                </>
                            )}
                            {activeTab === 'notifications' && (
                                <>
                                    <Header title="通知" />
                                    <div className="p-10 text-center text-gray-500 bg-white dark:bg-black">
                                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">通知</h2>
                                        <p>暂无新消息。</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right Column (Trends/Suggestions) - Optional */}
                        <div className="hidden lg:block w-[350px] p-4 pl-8 bg-white dark:bg-black">
                            <div className="bg-gray-100 dark:bg-[#16181C] rounded-2xl p-4 mb-4">
                                <h3 className="font-bold text-xl mb-4 text-gray-900 dark:text-white">推荐关注</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">HOS Team</div>
                                            <div className="text-gray-500 text-sm">@hos_official</div>
                                        </div>
                                        <button className="ml-auto bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-full font-bold text-sm hover:opacity-80 transition-opacity">关注</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Mobile Bottom Navigation (Visible only on small screens) */}
                    <div className="md:hidden absolute bottom-0 left-0 w-full bg-white dark:bg-black border-t border-gray-200 dark:border-white/10 flex justify-around p-3 pb-[env(safe-area-inset-bottom)] z-50">
                        <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-blue-500 font-bold' : 'text-gray-400'}>Home</button>
                        <button onClick={() => setActiveTab('explore')} className={activeTab === 'explore' ? 'text-blue-500 font-bold' : 'text-gray-400'}>Explore</button>
                        <button onClick={() => setActiveTab('notifications')} className={activeTab === 'notifications' ? 'text-blue-500 font-bold' : 'text-gray-400'}>Bell</button>
                        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-blue-500 font-bold' : 'text-gray-400'}>Me</button>
                    </div>
                </div>
            </IOSPage>
        </SmallWorldProvider>
    );
};

export default SmallWorldApp;
