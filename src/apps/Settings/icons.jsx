import React from 'react';

// --- 基础配置 ---
const STROKE_WIDTH = 2.5;

/** 
 * 超萌手绘风图标库
 * 特点：线条抖动、比例矮胖、视觉肉乎、带装饰小星星
 */

// --- 1. 深浅色模式切换 ---

export const LightModeIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 8.5c-2.3 0-3.5 1.2-3.5 3.5s1.2 3.5 3.5 3.5 3.5-1.2 3.5-3.5-1.2-3.5-3.5-3.5z" />
        <path d="M12 2.5v1.5M12 20.5v1.5M4 12.5h-1.5M21.5 12.5h-1.5M6.5 7l-1 1M18.5 18l-1 1M6.5 18l-1-1M18.5 7l-1 1" />
        <circle cx="19" cy="4" r="0.5" fill={color} stroke="none" />
    </svg>
);

export const DarkModeIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M11.5 3.5c-4.5.2-8.2 4.1-8 8.7.2 4.2 3.8 7.5 8 7.3 1.5 0 2.8-.4 4-1.2-1.2-1-1.8-2.5-1.8-4.2s.8-3.2 2-4.2c-1.3-.4-2.7-.4-4.2-.4z" fill={color} stroke="none" />
        <path d="M18 4.5l1.5 1.5M19.5 4.5L18 6" />
        <circle cx="6" cy="18" r="0.6" fill={color} stroke="none" />
    </svg>
);

// --- 2. 主题页功能模块 ---

export const WallpaperIconIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M5.5 4c-1.5 0-2.5 1-2.5 2.5v11c0 1.5 1 2.5 2.5 2.5h13c1.5 0 2.5-1 2.5-2.5v-11c0-1.5-1-2.5-2.5-2.5h-13z" />
        <path d="M4 17c2-3.5 4-5.5 7-3 2 1.5 4.5 0 6.5-2.5l2.5 2.5" />
        <circle cx="16" cy="8.5" r="1" fill={color} stroke="none" />
    </svg>
);

export const AppIconIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M7.5 3.5h9c2 0 3.5 1.5 3.5 3.5v9c0 2-1.5 3.5-3.5 3.5h-9c-2 0-3.5-1.5-3.5-3.5v-9C4 5 5.5 3.5 7.5 3.5z" />
        <rect x="8" y="8" width="3" height="3" rx="1" fill={color} stroke="none" />
        <rect x="13.5" y="8" width="3" height="3" rx="1" fill={color} stroke="none" />
        <rect x="8" y="13.5" width="3" height="3" rx="1" fill={color} stroke="none" />
        <circle cx="15" cy="15" r="1.5" fill={color} stroke="none" />
    </svg>
);

export const WidgetIconIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M5 3.5c-1.5 0-2 1-2 2.5v3c0 1.5.5 2.5 2 2.5h14c1.5 0 2-1 2-2.5v-3c0-1.5-.5-2.5-2-2.5H5z" />
        <path d="M6 16c-1.5 0-2 1-2 2.5s.5 2.5 2 2.5h3c1.5 0 2-1 2-2.5s-.5-2.5-2-2.5H6z" />
        <path d="M15 17.5l2 2 4-4" />
    </svg>
);

export const FontIconIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M6.5 19.5c1-6 4-15 5.5-15s4.5 9 5.5 15" />
        <path d="M8.5 13.5c3 .5 6 .5 9 0" />
        <circle cx="19" cy="6" r="0.8" fill={color} stroke="none" />
    </svg>
);

// --- 3. 设置主页入口 ---

// 大脑连接 (API) - 像个软糯的云朵/大脑
export const BrainIcon = ({ size = 20, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M9.5 18c-2.5 0-4.5-1.5-4.5-4 0-1.5.8-2.8 2-3.5-.2-1 .5-3 2.5-3 1.5 0 2.2 1 2.5 2 .5-1 1.5-2 3-2 2.5 0 3.5 2 3.5 4 0 2.5-2 4.5-4.5 4.5h-4.5z" />
        <circle cx="10" cy="11" r="0.5" fill={color} />
        <circle cx="14" cy="13" r="0.5" fill={color} />
    </svg>
);

// 应用与通知 (Bell) - 胖乎乎的小铃铛
export const NotificationIcon = ({ size = 20, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 4c-2.5 0-4.5 1.5-4.5 4v4.5c0 1-1 2-2.5 2.5 0 0 0 1 1 1h12c1 0 1-1 1-1-1.5-.5-2.5-1.5-2.5-2.5V8c0-2.5-2-4-4.5-4z" />
        <path d="M10.5 18.5c.2 1 1 1.5 1.5 1.5s1.3-.5 1.5-1.5" />
        <path d="M19 7l1-1M18.5 4l.5.5" />
    </svg>
);

// 主题美化 (Palette) - 圆滚滚的调色盘
export const PaletteIcon = ({ size = 20, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 3.5c-5 0-8.5 3-8.5 8s3 8.5 8.5 8.5a7 7 0 0 0 5-2c1.5-1.5 3-2 3-4s-1.5-5.5-8-10.5z" />
        <circle cx="8" cy="10" r="1.2" fill={color} stroke="none" />
        <circle cx="12" cy="8" r="1.2" fill={color} stroke="none" />
        <circle cx="16" cy="11" r="1.2" fill={color} stroke="none" />
    </svg>
);

// 数据存储 (Database) - 像个胖面包一样的柜子
export const DataIcon = ({ size = 20, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4.5 7c0-1.5 3-3 7.5-3s7.5 1.5 7.5 3-3 3-7.5 3-7.5-1.5-7.5-3z" />
        <path d="M4.5 7v10c0 1.5 3 3 7.5 3s7.5-1.5 7.5-3V7" />
        <path d="M4.5 12c1 1 3.5 1.5 7.5 1.5s6.5-.5 7.5-1.5" />
        <circle cx="21" cy="9" r="0.5" fill={color} />
    </svg>
);

// 关于 HOS (Info) - 歪歪扭扭的感叹号
export const InfoIcon = ({ size = 20, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 3.5c-4.5 0-8 3.5-8 8s3.5 8 8 8 8-3.5 8-8-3.5-8-8-8z" />
        <path d="M12 11.5v4" />
        <circle cx="11.8" cy="8" r="1.5" fill={color} stroke="none" />
        <path d="M18 18l.5.5M19 17l-.5.5" />
    </svg>
);

// 列表箭头 (ChevronRight) - 弯弯的小勾
export const ChevronIcon = ({ size = 20, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M10 8l4.5 4-4.5 4" />
    </svg>
);

// 返回箭头 (ChevronLeft)
export const BackIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M15 18l-5.5-6 5.5-6" />
    </svg>
);
