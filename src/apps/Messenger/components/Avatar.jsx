import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

const Avatar = ({ src, name, size = 50, className = '' }) => {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        let objectUrl = null;
        if (src instanceof Blob) {
            objectUrl = URL.createObjectURL(src);
            setPreview(objectUrl);
        } else {
            setPreview(src);
        }

        // Cleanup function to revoke the URL when the component unmounts or src changes
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
