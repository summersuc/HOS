import React, { useState, useEffect } from 'react';
import WidgetBase from '../WidgetBase';
import { WIDGET_SIZES } from '../registry';
import { storageService } from '../../../services/StorageService';
import { db } from '../../../db/schema';

const PhotoWidget = ({ settings, size = WIDGET_SIZES.SMALL }) => {
    const { imageType, imagePayload } = settings || {};

    // Default image - White placeholder
    const defaultImage = "https://placehold.co/400/FFFFFF/FFFFFF/png";
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
                        console.error("Photo Widget Load Fail", e);
                    }
                }
            } else if (imageType === 'url' && imagePayload) {
                if (active) setDisplayImage(imagePayload);
            }
        };
        load();
        return () => { active = false; };
    }, [imageType, imagePayload]);

    return (
        <WidgetBase variant="transparent" size={size} className="group overflow-visible flex items-center justify-center">
            <img
                src={displayImage}
                alt="Widget"
                className="w-full h-full object-cover rounded-[22px] shadow-sm transition-transform duration-700 group-hover:scale-105"
            />
        </WidgetBase>
    );
};

export default PhotoWidget;
