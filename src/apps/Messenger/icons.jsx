import React from 'react';

// --- 导航与基础 ---
export const ChevronRight = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M10 18c0-1.5 2.5-3.5 4-6-1.5-2.5-4-4.5-4-6" />
    </svg>
);

export const Heart = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M12.5 21.5c-6-4.5-9.5-7.5-9.5-12.5 0-4 4.5-5 7-2 1.5-1.5 7-3 10 0 3 3 0 8.5-7.5 14.5z" /><path d="M19 5l1-1" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

export const MoreHorizontal = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3.5" />
    </svg>
);

// --- 输入与操作 ---
export const PlusCircle = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M12 3c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z" /><path d="M12 8v8" /><path d="M8 12h8" />
    </svg>
);

export const Smile = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M12 2.5c5.5 0 9.5 4 9.5 9.5s-4 9.5-9.5 9.5S2.5 17.5 2.5 12 6.5 2.5 12 2.5z" /><path d="M8 14c1.5 2 4 2.5 6 1.5 1-.5 1.5-1.5 1.5-1.5" /><path d="M9 9h.01" strokeWidth="3" /><path d="M15 9h.01" strokeWidth="3" />
    </svg>
);

export const Send = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M22 2l-8 20c-1 .5-2-1-1.5-2l2.5-7L22 2z" /><path d="M22 2L11 13" /><path d="M22 2l-20 8c-1 .5 1 2 2 1.5l7-2.5" />
    </svg>
);

export const Mic = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10c0 3.5-3 7-7 7s-7-3.5-7-7" /><path d="M12 17v5" /><path d="M8 22h8" />
    </svg>
);

// --- 消息菜单 ---
export const Reply = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M9 14L4 10l5-4" /><path d="M4 10h8c4 0 7 2 7 7 0 2-2 3-3 3" />
    </svg>
);

export const Edit2 = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M16 3c1.5-1 3.5 1 2.5 2.5L7 17l-4.5 1.5L4 14 16 3z" /><path d="M13 6l3 3" />
    </svg>
);

export const Copy = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M9 9h10c1.5 0 2 1 2 2.5v9c0 1.5-1 2-2.5 2H9c-1.5 0-2-.5-2-2V11c0-1.5.5-2 2-2z" /><path d="M5 15H4c-1 0-2-.5-2-2V4c0-1.5.5-2 2-2h9c1.5 0 2 .5 2 2v1" />
    </svg>
);

export const RotateCcw = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M3 10l-1-6 6 1" /><path d="M3 10c1-5 6.5-8 11.5-6C19 5 22 9 21 15c-1 4-5 7-10 7-3 0-5.5-1-7-3" />
    </svg>
);

export const Trash2 = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M3 6h18" /><path d="M19 6l-1.5 13a3 3 0 0 1-3 2.5H8.5a3 3 0 0 1-3-2.5L4 6" /><path d="M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
    </svg>
);

// --- 功能面板 ---
export const Image = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M4 3h16c2 0 2 2 2 4v10c0 2-1 4-4 4H6c-3 0-4-2-4-4V7c0-2 1-4 2-4z" /><path d="M4 16l4-4 5 5 4-3 5 5" /><path d="M9 9h.01" strokeWidth="3.5" />
    </svg>
);

export const Gift = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M20 12v9c0 1-1 2-3 2H7c-2 0-3-1-3-2v-9" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5c-3 0-3-4 0-5C10 2 12 7 12 7z" /><path d="M12 7h4.5c3 0 3-4 0-5C14 2 12 7 12 7z" />
    </svg>
);

export const Wallet = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M19 7V5c0-1.5-1-3-3-3H4c-1.5 0-2.5 1-2 3v12c-.5 2 1 4 3 4h12c2 0 3-1.5 3-3v-4" /><path d="M16 11h3c1.5 0 3 .5 3 2s-1.5 2-3 2h-3v-4z" />
    </svg>
);

export const RedPacket = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M18 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><path d="M4 9c4 2 12 2 16 0" /><circle cx="12" cy="12" r="2" />
    </svg>
);

export const ArrowRightLeft = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M16 11l5-4-5-4" /><path d="M21 7H3c-1 0-1 4 0 4" /><path d="M8 13L3 17l5 4" /><path d="M3 17h18c1 0 1-4 0-4" />
    </svg>
);

export const Music = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M9 17V5l11-2v11" /><path d="M9 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /><path d="M20 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
);

export const Sparkles = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M12 2c1 4 2 5 6 6-4 1-5 2-6 6-1-4-2-5-6-6 4-1 5-2 6-6z" /><path d="M18 16c1 2 1 3 4 3-3 0-3 1-4 3-1-2-1-3-4-3 3 0 3-1 4-3z" />
    </svg>
);

export const Bug = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M6 9c0-3.5 2.5-6 6-6s6 2.5 6 6v7c0 3-2 5-6 5s-6-2-6-5V9z" /><path d="M12 3v18" /><path d="M6 12H3" /><path d="M6 16l-2 1" /><path d="M18 12h3" /><path d="M18 16l2 1" /><path d="M8 7l-2-2" /><path d="M16 7l2-2" />
    </svg>
);

// --- 管理与状态 ---
export const FolderPlus = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M21 19c0 1.5-1.5 3-3 3H5c-1.5 0-3-1.5-3-3V6c0-1.5 1-3 2.5-3h4c1 0 2 1 2.5 2l.5 1h6.5c1.5 0 3 1.5 3 3v10z" /><path d="M12 11v6" /><path d="M9 14h6" />
    </svg>
);

export const Upload = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M21 16v3c0 2-2 3-4 3H7c-2 0-4-1-4-3v-3" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />
    </svg>
);

export const Check = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M20 6.5L9 18l-5-5.5" />
    </svg>
);

export const Plus = ({ size = 24, color = "currentColor", ...props }) => (
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
        <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
);

export const Play = ({ size = 24, color = "currentColor", ...props }) => (
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
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);
