import {
    SettingsIcon, ChatIcon, SmallWorldIcon, NotesIcon, CalendarIcon, MusicIcon, HeartbeatIcon, GameIcon
} from '../components/common/HandDrawnIcons';

export const appRegistry = {
    settings: {
        id: 'settings',
        name: '设置',
        icon: SettingsIcon,
        color: '#8E8E93',
        component: 'Settings',
        transmissionMode: 'C',
        notificationEnabled: false,
    },
    messenger: {
        id: 'messenger',
        name: '信息',
        icon: ChatIcon,
        color: '#8E8E93',
        component: 'Messenger',
        transmissionMode: 'A',
        notificationEnabled: true,
    },
    world: {
        id: 'world',
        name: '小世界',
        icon: SmallWorldIcon,
        color: '#8E8E93',
        component: 'SmallWorld',
        transmissionMode: 'A',
        notificationEnabled: true,
    },
    notes: {
        id: 'notes',
        name: '便笺',
        icon: NotesIcon,
        color: '#8E8E93',
        component: 'Notes',
        transmissionMode: 'B',
        notificationEnabled: false,
    },
    calendar: {
        id: 'calendar',
        name: '日历',
        icon: CalendarIcon,
        color: '#8E8E93',
        component: 'Calendar',
        transmissionMode: 'B',
        notificationEnabled: true,
    },
    music: {
        id: 'music',
        name: '音乐',
        icon: MusicIcon,
        color: '#8E8E93',
        component: 'Music',
        transmissionMode: 'C',
        notificationEnabled: false,
    },
    games: {
        id: 'games',
        name: '游戏',
        icon: GameIcon,
        color: '#8E8E93',
        component: 'Games',
        transmissionMode: 'C',
        notificationEnabled: false,
    },
    heartbeat: {
        id: 'heartbeat',
        name: '心动',
        icon: HeartbeatIcon,
        color: '#8E8E93',
        component: 'Heartbeat',
        transmissionMode: 'A',
        notificationEnabled: true,
    },
};

// Dock 默认配置（可自定义）
export const defaultDockApps = ['messenger', 'world', 'music', 'settings'];
