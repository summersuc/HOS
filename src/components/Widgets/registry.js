import ClockWidget from './ClockWidget';
import PhotoWidget from './PhotoWidget';

export const WIDGET_TYPES = {
    CLOCK: 'clock',
    PHOTO: 'photo',
};

export const WidgetRegistry = {
    [WIDGET_TYPES.CLOCK]: {
        id: WIDGET_TYPES.CLOCK,
        name: '数字时钟',
        component: ClockWidget,
        defaultSize: { w: 2, h: 2 }, // occupies 2x2 grid (if we had grid), or specific pixel class
        description: '多彩霓虹风格数字时钟'
    },
    [WIDGET_TYPES.PHOTO]: {
        id: WIDGET_TYPES.PHOTO,
        name: '相框',
        component: PhotoWidget,
        defaultSize: { w: 2, h: 2 },
        description: '展示你喜爱的照片'
    }
};
