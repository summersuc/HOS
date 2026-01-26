import React from 'react';

/**
 * 🧸 宝宝专属图标集 🧸
 * 风格: 超级Q弹手绘风 | 线宽: 2.5px
 * 颜色: 默认继承父级颜色 (currentColor)
 */

// --- 心动 (Heartbeat) ---
export const HeartbeatIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {/* 只有一个胖乎乎、软绵绵的大爱心，去掉了多余的装饰 */}
        <path d="M12 21.5C7 17 3 13.5 3 8.5c0-4 4-5 6.5-2.5 1.5 1.5 2.5 2.5 2.5 2.5s1-1 2.5-2.5C17 3.5 21 4.5 21 8.5c0 5-4 8.5-9 13z" />
    </svg>
);

// --- 设置 ---
export const SettingsIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {/* 修正后的外圈：像一个胖胖的小太阳花齿轮，尺寸控制在安全范围内 (3-21) */}
        <path d="M12 3.5c1.5 0 2.5 1.5 3 2.5s2.5.5 3.5 1.5 1 2.5 1.5 3.5 0 2.5-1.5 3.5-1 2.5-1.5 3.5-.5 2.5-1.5 3.5-2.5 1.5-3.5 1.5-2.5-1.5-3-2.5-.5-2.5-1.5-3.5-2.5-1-3.5-1.5 0-2.5 1.5-3.5 1-2.5 1.5-3.5.5-2.5 1.5-3.5 2.5-1.5 3.5-1.5z" />

        {/* 中间的小肚脐，圆圆的 */}
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </svg>
);

// --- 聊天 ---
export const ChatIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M16 5c3 0 5 2.5 5 5.5S18.5 16 15 16c-1 0-2.5-.5-3.5-1l-3 2c-.5.5-1 0-1-.5V15c-3-1-4.5-3.5-4.5-6C3 5.5 5.5 3 9 3c1 0 2 .5 3 1h4z" />
        <path d="M7 19c-1.5 1-2 1.5-2.5 1-.5-.5 0-1.5 1-2.5" />
        <path d="M10 9h.1" strokeWidth="3.5" />
        <path d="M13 9h.1" strokeWidth="3.5" />
        <path d="M16 9h.1" strokeWidth="3.5" />
    </svg>
);

// --- 便笺 ---
export const NotesIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M15 3H7C5 3 3 5 3 7v12c0 2 2 4 4 4h10c2 0 4-2 4-4V8l-6-5z" />
        <path d="M15 3v5h5" />
        <path d="M8 13c1-1 3-1 4 0s3 1 4 0" />
        <path d="M8 17c1-1 3-1 4 0s3 1 4 0" />
        <path d="M14 2l1-1" strokeWidth="3" />
    </svg>
);

// --- 音乐 ---
export const MusicIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M9 18c0-2 1.5-4 3.5-4S16 16 16 18s-1.5 4-3.5 4S9 20 9 18z" />
        <path d="M16 18V5c0-2 1-3 3-3s3 2 3 4-1.5 4-3.5 3" />
        <path d="M5 7l1 1" strokeWidth="3" />
        <path d="M7 5l-1 1" strokeWidth="3" />
    </svg>
);

// --- 日历 ---
export const CalendarIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M5 6C3 6 2 7 2 9v10c0 2 1 3 3 3h14c2 0 3-1 3-3V9c0-2-1-3-3-3H5z" />
        <path d="M7 4v4" />
        <path d="M17 4v4" />
        <path d="M8 14l2 3 5-5" />
    </svg>
);

// --- 小世界 ---
export const SmallWorldIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M12 20c-4.5 0-8-3.5-8-8s3.5-8 8-8 8 3.5 8 8-3.5 8-8 8z" />
        <path d="M3 12c0 3 4.5 5 9 5s9-2 9-5" />
        <path d="M18 5c1-1 2-1 3 0" strokeWidth="3" />
        <path d="M5 18c-1 1-2 1-3 0" strokeWidth="3" />
    </svg>
);

// --- 游戏 (Game) ---
export const GameIcon = ({ size = 24, color = "currentColor", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {/* 胖乎乎的游戏手柄主体，有点像个蚕豆 */}
        <path d="M21 12c0 4.5-2.5 7-6 7H9c-3.5 0-6-2.5-6-7s2.5-7 6-7h6c3.5 0 6 2.5 6 7z" />

        {/* 左边的十字键，画成两条软软的交叉线 */}
        <path d="M9 9v6" />
        <path d="M6 12h6" />

        {/* 右边的两个按钮，用两个胖胖的点代替 (利用 stroke-linecap: round 实现) */}
        <path d="M17 10h.01" strokeWidth="3.5" />
        <path d="M19 13h.01" strokeWidth="3.5" />
    </svg>
);
