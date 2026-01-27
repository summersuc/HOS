import React from 'react';
import { Home, Compass, Plus, MessageCircle, User } from 'lucide-react';

const TabBar = ({ activeTab, onTabChange, onCompose }) => {
    const tabs = [
        { id: 'home', Icon: Home, label: '首页' },
        { id: 'discover', Icon: Compass, label: '发现' },
        { id: 'compose', Icon: Plus, label: null },
        { id: 'message', Icon: MessageCircle, label: '消息' },
        { id: 'profile', Icon: User, label: '我' }
    ];

    return (
        <div className="sw-tabbar flex-shrink-0 w-full flex justify-around items-center h-[calc(50px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] z-50">
            {tabs.map((tab) => {
                // 发布按钮 - 特殊处理
                if (tab.id === 'compose') {
                    return (
                        <div key={tab.id} className="flex-1 flex justify-center h-full items-center">
                            <button
                                onClick={onCompose}
                                className="sw-compose-btn"
                            >
                                <Plus size={22} strokeWidth={3} />
                            </button>
                        </div>
                    );
                }

                const isActive = activeTab === tab.id;
                const IconComponent = tab.Icon;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`sw-tab-item ${isActive ? 'active' : ''}`}
                    >
                        <div className="sw-tab-icon">
                            <IconComponent
                                size={24}
                                strokeWidth={isActive ? 2.2 : 1.5}
                                fill={isActive ? 'currentColor' : 'none'}
                            />
                        </div>
                        <span className="sw-tab-label">
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default TabBar;
