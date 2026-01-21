import {
    Settings, MessageSquare, Globe, StickyNote, Calendar, Gamepad2, Music
} from 'lucide-react';

export const appRegistry = {
    settings: {
        id: 'settings',
        name: '设置',
        icon: Settings,
        color: '#8E8E93', // System Gray
        component: 'Settings',
        transmissionMode: 'C',
        notificationEnabled: false,
    },
    messenger: {
        id: 'messenger',
        name: '信息',
        icon: MessageSquare,
        color: '#34C759', // System Green
        component: 'Messenger',
        transmissionMode: 'A',
        notificationEnabled: true,
    },
    world: {
        id: 'world',
        name: '小世界',
        icon: Globe,
        color: '#007AFF', // System Blue
        component: 'World',
        transmissionMode: 'A',
        notificationEnabled: true,
    },
    notes: {
        id: 'notes',
        name: '便笺',
        icon: StickyNote,
        color: '#FFCC00', // System Yellow
        component: 'Notes',
        transmissionMode: 'B',
        notificationEnabled: false,
    },
    calendar: {
        id: 'calendar',
        name: '日历',
        icon: Calendar,
        color: '#FF3B30', // System Red
        component: 'Calendar',
        transmissionMode: 'B',
        notificationEnabled: true,
    },
    games: {
        id: 'games',
        name: '游戏',
        icon: Gamepad2,
        color: '#5856D6', // System Indigo
        component: 'Games',
        transmissionMode: 'C',
        notificationEnabled: false,
    },
    music: {
        id: 'music',
        name: '音乐',
        icon: Music,
        color: '#FF2D55', // System Pink
        component: 'Music',
        transmissionMode: 'C',
        notificationEnabled: false,
    },
};

// Dock 默认配置（可自定义）
export const defaultDockApps = ['messenger', 'world', 'music', 'settings'];
