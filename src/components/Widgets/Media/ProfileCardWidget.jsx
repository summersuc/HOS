import React, { useState, useEffect } from 'react';
import WidgetBase from '../WidgetBase';
import { WIDGET_SIZES } from '../registry';
import { storageService } from '../../../services/StorageService';
import { db } from '../../../db/schema';
import { Hash } from 'lucide-react'; // Using Hash icon for the status bar "#"

const ProfileCardWidget = ({ settings, size }) => {
    const {
        avatarType,
        avatarPayload,
        titleText,
        statusText,
        bgColor = 'glass' // 'glass' | 'white' | hex
    } = settings || {};

    const displayTitle = titleText || "sun: 📷/";
    const displayStatus = statusText || "#15° Starry - eyed";

    const [avatarUrl, setAvatarUrl] = useState("https://placehold.co/150x150/png"); // Default placeholder

    // Load Avatar
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (avatarType === 'blob' && avatarPayload) {
                const cached = storageService.getCachedBlobUrl('blobs', avatarPayload);
                if (cached) {
                    if (active) setAvatarUrl(cached);
                } else {
                    try {
                        const record = await db.blobs.get(avatarPayload);
                        if (record && record.data) {
                            const url = URL.createObjectURL(record.data);
                            if (active) setAvatarUrl(url);
                        }
                    } catch (e) {
                        console.error("Profile Widget Avatar Load Fail", e);
                    }
                }
            } else if (avatarType === 'url' && avatarPayload) {
                if (active) setAvatarUrl(avatarPayload);
            }
        };
        load();
        return () => { active = false; };
    }, [avatarType, avatarPayload]);

    // Handle Background Style
    const getBgStyle = () => {
        if (bgColor === 'glass') return {}; // WidgetBase handles glass class
        if (bgColor === 'transparent') return { background: 'transparent' };
        if (bgColor && bgColor !== 'glass') return { backgroundColor: bgColor };
        return {};
    };

    return (
        <WidgetBase
            variant={bgColor === 'glass' || !bgColor ? 'glass' : 'solid'}
            size={size}
            className="flex flex-col items-center justify-center p-3 gap-0.5"
            style={getBgStyle()}
        >
            {/* Avatar */}
            <div className="relative group cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-500 shrink-0">
                <div className="w-[76px] h-[76px] rounded-full overflow-hidden shadow-sm">
                    <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        draggable="false"
                    />
                </div>
            </div>

            {/* Title */}
            <div className="text-[12px] font-medium text-gray-700 dark:text-gray-200 tracking-wide text-center truncate w-full px-2 mt-1 mb-1">
                {displayTitle}
            </div>

            {/* Status Bar */}
            <div className="bg-gray-300/60 dark:bg-white/15 backdrop-blur-md rounded-full px-0.5 py-0.5 pr-3 flex items-center gap-2 max-w-[92%] shadow-inner border border-white/10 dark:border-white/5">
                <div className="w-5 h-5 rounded-full bg-gray-500/80 dark:bg-gray-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Hash size={10} strokeWidth={3} />
                </div>
                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate opacity-90">
                    "{displayStatus}"
                </span>
            </div>
        </WidgetBase>
    );
};

export default ProfileCardWidget;
