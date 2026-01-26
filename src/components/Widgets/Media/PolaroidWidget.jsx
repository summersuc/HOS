import React, { useState, useEffect } from 'react';
import WidgetBase from '../WidgetBase';
import { WIDGET_SIZES } from '../registry';
import { motion } from 'framer-motion';
import { storageService } from '../../../services/StorageService';
import { db } from '../../../db/schema';

const PolaroidWidget = ({ settings, size = WIDGET_SIZES.SMALL }) => {
    // Settings: imageType ('blob' | 'url'), imagePayload (blobId | urlString), text
    const { imageType, imagePayload, text } = settings || {};

    // Default placeholder
    const defaultImage = "https://images.unsplash.com/photo-1493514789931-5f7514744eb6?q=80&w=600&auto=format&fit=crop";
    const [displayImage, setDisplayImage] = useState(defaultImage);

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (imageType === 'blob' && imagePayload) {
                const cached = storageService.getCachedBlobUrl('blobs', imagePayload);
                if (cached) {
                    if (active) setDisplayImage(cached);
                } else {
                    try {
                        const record = await db.blobs.get(imagePayload);
                        if (record && record.data) {
                            const url = URL.createObjectURL(record.data);
                            if (active) setDisplayImage(url);
                        }
                    } catch (e) {
                        console.error("Polaroid Image Load Fail", e);
                    }
                }
            } else if (imageType === 'url' && imagePayload) {
                if (active) setDisplayImage(imagePayload);
            }
        };
        load();
        return () => { active = false; };
    }, [imageType, imagePayload]);

    const displayText = text || "美好的瞬间";
    const isVertical = size === WIDGET_SIZES.VERTICAL_S || size === WIDGET_SIZES.VERTICAL_M;

    return (
        <WidgetBase variant="polaroid" className="group">
            {/* Photo Area */}
            <div className="flex-1 w-full relative overflow-hidden bg-gray-100 rounded-[2px]">
                <motion.img
                    src={displayImage}
                    alt="Memory"
                    className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />
                {/* Optional Filter Overlay */}
                <div className="absolute inset-0 bg-yellow-500/5 mix-blend-overlay pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Bottom Text Area */}
            <div className={`w-full flex items-center justify-center ${isVertical ? 'h-10' : 'h-8'}`}>
                <span className="font-handwriting text-gray-600 text-sm transform -rotate-1 select-none font-semibold truncate px-2">
                    {displayText}
                </span>
            </div>
        </WidgetBase>
    );
};

export default PolaroidWidget;
