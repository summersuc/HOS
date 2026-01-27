import PhotoWidget from './Media/PhotoWidget';
import ProfileCardWidget from './Media/ProfileCardWidget';
import AnniversaryWidget from './Media/AnniversaryWidget';
import MusicWidget from './Media/MusicWidget';
import StickyNoteWidget from './Text/StickyNoteWidget';

export const WIDGET_SIZES = {
    ICON: '1x1',        // ~80x80
    SMALL: '2x2',       // ~170x170 (Standard Small)
    MEDIUM: '4x2',      // ~360x170 (Wide)
    LARGE: '4x4',       // ~360x360
    WIDE_SMALL: '2x1',  // ~170x80
    VERTICAL_S: '1x2',  // ~80x170
    VERTICAL_M: '1x3',  // ~80x260 (Tall strip)
};

export const WIDGET_CATEGORIES = {
    PHOTOS: '照片',
    ANNIVERSARY: '纪念日',
    MUSIC: '音乐',
    TEXT: '文本',
};

// Helper to get pixel dimensions (approx, for previews)
export const getWidgetSizeStyle = (size) => {
    // Standardizing to 160x160 for 2x2
    // If 2x2 = 160, then unit = (160 - gap) / 2
    // With gap = 12, unit = 148 / 2 = 74
    const unit = 74;
    const gap = 8;
    switch (size) {
        case WIDGET_SIZES.ICON: return { width: unit, height: unit };
        case WIDGET_SIZES.SMALL: return { width: 162, height: 162 };
        case WIDGET_SIZES.MEDIUM: return { width: 312, height: 160 }; // Further narrowed per user request
        case WIDGET_SIZES.LARGE: return { width: unit * 4 + gap * 3, height: unit * 4 + gap * 3 };
        case WIDGET_SIZES.WIDE_SMALL: return { width: 160, height: unit };
        case WIDGET_SIZES.VERTICAL_S: return { width: unit, height: 160 };
        case WIDGET_SIZES.VERTICAL_M: return { width: unit, height: unit * 3 + gap * 2 };
        default: return { width: 160, height: 160 };
    }
};

export const WidgetRegistry = {
    'media.photo': {
        id: 'media.photo',
        name: '精选照片',
        category: WIDGET_CATEGORIES.PHOTOS,
        component: PhotoWidget,
        availableSizes: [WIDGET_SIZES.SMALL],
        description: '展示您喜爱的照片。',
        hasConfig: true
    },
    'media.profile': {
        id: 'media.profile',
        name: 'Ins主页',
        category: WIDGET_CATEGORIES.PHOTOS,
        component: ProfileCardWidget,
        availableSizes: [WIDGET_SIZES.SMALL],
        description: '展示个性的Ins风格主页卡片。',
        hasConfig: true
    },
    'media.anniversary': {
        id: 'media.anniversary',
        name: '纪念日',
        category: WIDGET_CATEGORIES.ANNIVERSARY,
        component: AnniversaryWidget,
        availableSizes: [WIDGET_SIZES.SMALL],
        description: '记录心动瞬间 (双头像/气泡/飘雪)。',
        hasConfig: true
    },
    'media.music': {
        id: 'media.music',
        name: '音乐',
        category: WIDGET_CATEGORIES.MUSIC,
        component: MusicWidget,
        availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
        description: '控制当前播放的音乐。',
        hasConfig: false
    },
    'text.sticky': {
        id: 'text.sticky',
        name: '便利贴',
        category: WIDGET_CATEGORIES.TEXT,
        component: StickyNoteWidget,
        availableSizes: [WIDGET_SIZES.SMALL],
        description: '三层文本手账便利贴 (日期/图钉)。',
        hasConfig: true
    }
};
