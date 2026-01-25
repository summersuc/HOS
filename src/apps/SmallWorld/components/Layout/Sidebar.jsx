import React from 'react';
import { Home, Search, Bell, Mail, User, Globe } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-4 px-4 py-3 w-full rounded-full transition-all duration-200 group ${active ? 'font-bold' : 'hover:bg-white/10'}`}
    >
        <div className="relative">
            <Icon size={26} strokeWidth={active ? 3 : 2} className={active ? 'text-white' : 'text-white'} />
            {label === '通知' && <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-black" />}
        </div>
        <span className={`text-xl hidden xl:block ${active ? 'text-white' : 'text-white'}`}>{label}</span>
    </button>
);

const Sidebar = ({ activeTab, onTabChange }) => {
    return (
        <div className="h-full px-2 py-4 flex flex-col items-end xl:items-start w-[88px] xl:w-[275px] border-r border-white/10">
            <div className="mb-8 px-4">
                <div className="w-12 h-12 rounded-full hover:bg-blue-500/10 flex items-center justify-center transition-colors cursor-pointer">
                    <Globe size={30} className="text-white" />
                </div>
            </div>

            <nav className="flex-1 flex flex-col gap-2 w-full">
                <SidebarItem
                    icon={Home}
                    label="主页"
                    active={activeTab === 'home'}
                    onClick={() => onTabChange('home')}
                />
                <SidebarItem
                    icon={Search}
                    label="探索"
                    active={activeTab === 'explore'}
                    onClick={() => onTabChange('explore')}
                />
                <SidebarItem
                    icon={Bell}
                    label="通知"
                    active={activeTab === 'notifications'}
                    onClick={() => onTabChange('notifications')}
                />
                <SidebarItem
                    icon={User}
                    label="个人资料"
                    active={activeTab === 'profile'}
                    onClick={() => onTabChange('profile')}
                />
            </nav>

            <div className="my-4 w-full">
                <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 xl:px-8 xl:py-3 w-full shadow-lg transition-colors font-bold text-lg flex items-center justify-center">
                    <span className="xl:hidden">+</span>
                    <span className="hidden xl:inline">发布推文</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
