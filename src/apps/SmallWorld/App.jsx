import React, { useState } from 'react';
import { SmallWorldProvider } from './data/SmallWorldContext';
import IOSPage from '../../components/AppWindow/IOSPage';
import TabBar from './components/Layout/TabBar';
import NavBar from './components/Layout/NavBar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import './styles/SmallWorld.css';

// Placeholder Pages for sections not fully spec'd yet
const PagePlaceholder = ({ title }) => (
    <div className="flex-1 flex items-center justify-center text-gray-400 bg-[#FAFAFA] dark:bg-black">
        {title} 页面开发中...
    </div>
);

const SmallWorldApp = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('home');

    const handleCompose = () => {
        alert("Compose Modal - Coming Soon");
    };

    return (
        <SmallWorldProvider>
            <IOSPage title={null} onBack={onClose} enableEnterAnimation={false} showBackButton={false}>
                <div className="small-world-app w-full h-full bg-[#f2f2f2] dark:bg-black text-gray-900 dark:text-white flex flex-col overflow-hidden relative font-sans select-none">

                    {/* Top Navigation (Weibo Style) - Hide on Profile tab to avoid double headers */}
                    {activeTab !== 'profile' && <NavBar activeTab={activeTab} />}

                    {/* Main Content Area - Scrollable */}
                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        {activeTab === 'home' && <Home />}
                        {activeTab === 'discover' && <PagePlaceholder title="发现 (Discover)" />}
                        {activeTab === 'message' && <PagePlaceholder title="消息 (Message)" />}
                        {activeTab === 'profile' && <Profile />}
                    </div>

                    {/* Bottom Tab Bar (Fixed) */}
                    <TabBar
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        onCompose={handleCompose}
                    />

                </div>
            </IOSPage>
        </SmallWorldProvider>
    );
};

export default SmallWorldApp;
