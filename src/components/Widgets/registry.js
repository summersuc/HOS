import PhotoWidget from './Media/PhotoWidget';
import AnniversaryWidget from './Media/AnniversaryWidget';
import MusicWidget from './Media/MusicWidget';

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
    RECOMMENDED: 'recommended',
    SYSTEM: 'system',
    MEDIA: 'media',
    TOOLS: 'tools',
};

// Helper to get pixel dimensions (approx, for previews)
export const getWidgetSizeStyle = (size) => {
    const unit = 75;
    const gap = 12;
    switch (size) {
        case WIDGET_SIZES.ICON: return { width: unit, height: unit };
        case WIDGET_SIZES.SMALL: return { width: unit * 2 + gap, height: unit * 2 + gap };
        case WIDGET_SIZES.MEDIUM: return { width: unit * 4 + gap * 3, height: unit * 2 + gap };
        case WIDGET_SIZES.LARGE: return { width: unit * 4 + gap * 3, height: unit * 4 + gap * 3 };
        case WIDGET_SIZES.WIDE_SMALL: return { width: unit * 2 + gap, height: unit };
        case WIDGET_SIZES.VERTICAL_S: return { width: unit, height: unit * 2 + gap };
        case WIDGET_SIZES.VERTICAL_M: return { width: unit, height: unit * 3 + gap * 2 };
        default: return { width: unit * 2 + gap, height: unit * 2 + gap };
    }
};

export const WidgetRegistry = {
    'media.photo': {
        id: 'media.photo',
        name: '精选照片',
        category: WIDGET_CATEGORIES.MEDIA,
        component: PhotoWidget,
        availableSizes: [WIDGET_SIZES.SMALL],
        description: '展示您喜爱的照片。',
        hasConfig: true // Enables config modal
    },
    'media.anniversary': {
        id: 'media.anniversary',
        name: '纪念日',
        category: WIDGET_CATEGORIES.MEDIA,
        component: AnniversaryWidget,
        availableSizes: [WIDGET_SIZES.SMALL],
        description: '记录心动瞬间 (双头像/气泡/飘雪)。',
        hasConfig: true
    },
    'media.music': {
        id: 'media.music',
        name: '音乐',
        category: WIDGET_CATEGORIES.MEDIA,
        component: MusicWidget,
        availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
        description: '控制当前播放的音乐。',
        hasConfig: false
    }
};
