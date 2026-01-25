import React, { useState, useEffect } from 'react';
import WidgetBase from '../WidgetBase';
import { WIDGET_SIZES } from '../registry';
import { storageService } from '../../../services/StorageService';

const PhotoWidget = ({ settings, size = WIDGET_SIZES.SMALL }) => {
    const { imageType, imagePayload } = settings || {};

    // Default image
    const defaultImage = "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=600&auto=format&fit=crop";
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
                        const { db } = await import('../../../db/schema');
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
        <WidgetBase variant="solid" className="group overflow-hidden">
            <img
                src={displayImage}
                alt="Widget"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
        </WidgetBase>
    );
};

export default PhotoWidget;
