import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { storageService } from '../../../services/StorageService';

const Avatar = ({ src, name, size = 50, className = '' }) => {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        // 1. Try Cache First (Sync & Instant)
        // If src is a blob/string, we might have a cached version if we know the ID, 
        // BUT here src is usually passed as the raw content from the DB record.
        // If the DB logic passed the Blob, we can't look it up by ID easily unless we pass ID.
        // HOWEVER, storageService.preloadTable populates cache with 'table:id' keys.
        // The components using Avatar usually pass `avatar` field which is Blob or String.
        // We need to bridge this. 

        // Optimization: If the `src` passed in IS the blob object that was preloaded, 
        // we might not know its ID here. 
        // But `preloadTable` creates URLs. 
        // If we want to use the preloaded URL, `src` should ideally be the ID or we need a way to map.

        // Wait! The DB returns the Blob object. 
        // The StorageService cache maps ID -> URL.
        // Setting `src` to the Blob again creates a NEW URL every time.

        // STRATEGY CHANGE: 
        // We can't easily map Blob -> ID here without changing all props to pass ID.
        // BUT, we can support 'idb:table:id' string format or just check if `src` is potentially a string key.

        let objectUrl = null;

        if (typeof src === 'string' && (src.startsWith('idb:') || src.startsWith('blob:'))) {
            // It's a reference or already a URL
            if (src.startsWith('idb:')) {
                const cached = storageService.getCachedBlobUrl(src);
                if (cached) {
                    setPreview(cached);
                    return;
                }
            }
            setPreview(src);
        } else if (src instanceof Blob) {
            // It's a raw Blob. 
            // Limitation: We create a new URL. 
            // To fully utilize preloading, parent components should pass the ID reference or 
            // we should rely on the fact that if it's in memory, it's fast. 
            // BUT strict preloading means we want to use the SAME URL to avoid flicker.

            // For now, standard behavior fallback.
            objectUrl = URL.createObjectURL(src);
            setPreview(objectUrl);
        } else {
            setPreview(src);
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
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
