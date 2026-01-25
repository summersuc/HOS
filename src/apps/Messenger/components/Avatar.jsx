import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { storageService } from '../../../services/StorageService';

const Avatar = ({ src, name, size = 50, className = '' }) => {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        let objectUrl = null;
        let unsubscribe = null;

        const updatePreview = () => {
            // 1. Handle Reference String (idb:table:id)
            if (typeof src === 'string' && src.startsWith('idb:')) {
                const cached = storageService.getCachedBlobUrl(src);
                if (cached) {
                    setPreview(cached);
                } else {
                    // Cache miss: Wait for preload or fallback to default
                    // We don't setPreview(src) here because 'idb:...' is not a valid image src
                    setPreview(null);
                }
            }
            // 2. Handle Blob Object (Legacy/Direct Usage)
            else if (src instanceof Blob) {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                objectUrl = URL.createObjectURL(src);
                setPreview(objectUrl);
            }
            // 3. Handle Regular URL or Base64
            else {
                setPreview(src);
            }
        };

        // Initial load
        updatePreview();

        // Subscribe to cache updates if using a reference
        if (typeof src === 'string' && src.startsWith('idb:')) {
            unsubscribe = storageService.subscribe(() => {
                updatePreview();
            });
        }

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            if (unsubscribe) unsubscribe();
        };
    }, [src]);

    return (
        <div
            className={`rounded-xl overflow-hidden bg-gray-100 dark:bg-[#2C2C2E] shrink-0 border border-black/5 dark:border-white/5 flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
        >
            {preview ? (
                <img
                    src={preview}
                    className="w-full h-full object-cover"
                    alt={name}
                    onError={() => setPreview(null)}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold" style={{ fontSize: size * 0.4 }}>
                    {name?.[0] || <User size={size * 0.5} />}
                </div>
            )}
        </div>
    );
};

export default Avatar;
