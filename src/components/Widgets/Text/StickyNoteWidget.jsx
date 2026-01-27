import React, { useState, useEffect } from 'react';
import WidgetBase from '../WidgetBase';
import { Pin } from 'lucide-react';
import { storageService } from '../../../services/StorageService';
import { db } from '../../../db/schema';

const StickyNoteWidget = ({ settings, size }) => {
    const {
        topText,
        middleText,
        bottomText,
        bgColor = '#ffffff', // Hex
        bgOpacity = 100, // 0-100
        pinColor = '#ff6b6b',
        bgType = 'color', // 'color' | 'image'
        bgImageId,
        bgImageType
    } = settings || {};

    const [bgUrl, setBgUrl] = useState('');

    // Date Format: MM/DD
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;

    // Load Background Image
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (bgType === 'image' && bgImageId) {
                if (bgImageType === 'blob') {
                    const cached = storageService.getCachedBlobUrl('blobs', bgImageId);
                    if (cached) {
                        if (active) setBgUrl(cached);
                    } else {
                        try {
                            const record = await db.blobs.get(bgImageId);
                            if (record && record.data) {
                                const url = URL.createObjectURL(record.data);
                                if (active) setBgUrl(url);
                            }
                        } catch (e) {
                            console.error("Sticky Widget Bg Load Fail", e);
                        }
                    }
                } else {
                    if (active) setBgUrl(bgImageId);
                }
            } else {
                if (active) setBgUrl('');
            }
        };
        load();
        return () => { active = false; };
    }, [bgType, bgImageId, bgImageType]);

    const getContainerStyle = () => {
        const style = {};

        // Opacity handled via RGBA or parent opacity? 
        // Requirement says "background opacity".
        // If image, we might need an overlay or opacity on image.
        // Let's apply opacity to the background color layer.

        if (bgType === 'color') {
            style.backgroundColor = bgColor;
            // Provide a way to handle opacity if color is hex
            // Simply use style.opacity for the whole background layer if possible
        }

        return style;
    };

    return (
        <WidgetBase
            variant="solid"
            size={size}
            className="relative flex flex-col p-3 overflow-hidden shadow-sm transition-all"
            // We override background logic here for advanced customisation
            style={{
                background: 'transparent', // Reset base
                // Ensure text colors contrast? We'll default to dark text as sticky notes are usually light
            }}
        >
            {/* Background Layer */}
            <div
                className="absolute inset-0 z-0 transition-all duration-300"
                style={{
                    backgroundColor: bgType === 'color' ? bgColor : 'transparent',
                    backgroundImage: bgType === 'image' && bgUrl ? `url(${bgUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: bgOpacity / 100
                }}
            />

            {/* Content Layer */}
            <div className="relative z-10 w-full h-full flex flex-col">
                {/* Header Decoration */}
                <div className="flex justify-between items-start mb-1 h-6 shrink-0">
                    {/* Date */}
                    <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wider pl-0.5 select-none">
                        {dateStr}
                    </span>

                    {/* Pin - Tilted */}
                    <div className="transform rotate-12 -mr-1 -mt-1 drop-shadow-sm">
                        <Pin size={16} fill={pinColor} stroke={pinColor} className="opacity-90" />
                    </div>
                </div>

                {/* Text Area - Divided into 3 even sections */}
                <div className="flex-1 flex flex-col justify-between gap-0 min-h-0 px-1">

                    {/* Top Text */}
                    <div className="flex-1 flex items-center justify-start min-h-[30px]">
                        <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-900 leading-tight text-left line-clamp-2 w-full break-words">
                            {topText || "置顶事项"}
                        </span>
                    </div>

                    {/* Divider 1 */}
                    <div className="w-full border-t border-dashed border-gray-400/30 my-0.5 shrink-0" />

                    {/* Middle Text */}
                    <div className="flex-1 flex items-center justify-start min-h-[24px]">
                        <span className="text-[11px] font-medium text-gray-700/90 dark:text-gray-900/80 leading-tight text-left line-clamp-2 w-full break-words">
                            {middleText || "今日代办内容"}
                        </span>
                    </div>

                    {/* Divider 2 */}
                    <div className="w-full border-t border-dashed border-gray-400/30 my-0.5 shrink-0" />

                    {/* Bottom Text */}
                    <div className="flex-1 flex items-center justify-start min-h-[20px]">
                        <span className="text-[10px] text-gray-500 dark:text-gray-600 leading-tight text-left line-clamp-1 w-full break-normal">
                            {bottomText || "#标签 / 备注"}
                        </span>
                    </div>
                </div>
            </div>
        </WidgetBase>
    );
};

export default StickyNoteWidget;
