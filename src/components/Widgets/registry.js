import ClockWidget from './System/ClockWidget';
import PhotoWidget from './Media/PhotoWidget';
import PolaroidWidget from './Media/PolaroidWidget';
import WeatherWidget from './Info/WeatherWidget';

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
    'clock.digital': {
        id: 'clock.digital',
        name: '数字时钟',
        category: WIDGET_CATEGORIES.SYSTEM,
        component: ClockWidget,
        availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM, WIDGET_SIZES.WIDE_SMALL],
        description: '简约的数字时钟，支持多种风格。',
        hasConfig: false
    },
    'media.photo': {
        id: 'media.photo',
        name: '精选照片',
        category: WIDGET_CATEGORIES.MEDIA,
        component: PhotoWidget,
        availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
        description: '展示您喜爱的照片。',
        hasConfig: true // Enables config modal
    },
    'media.polaroid': {
        id: 'media.polaroid',
        name: '拍立得',
        category: WIDGET_CATEGORIES.MEDIA,
        component: PolaroidWidget,
        availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.VERTICAL_S, WIDGET_SIZES.VERTICAL_M],
        description: '复古拍立得风格，记录美好瞬间。',
        hasConfig: true
    },
    'info.weather': {
        id: 'info.weather',
        name: '实时天气',
        category: WIDGET_CATEGORIES.TOOLS,
        component: WeatherWidget,
        availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
        description: '查看实时天气状况与预报。',
        hasConfig: true // Needs city input
    }
};
