import React, { useRef } from 'react';

const PhotoWidget = ({ settings }) => {
    // settings.image should be a base64 string or url
    const image = settings?.image;

    return (
        <div className="w-full h-full rounded-[25px] overflow-hidden relative group bg-white dark:bg-[#1C1C1E] shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            {image ? (
                <img src={image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Widget" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-800">
                    <span className="text-2xl mb-2">🖼️</span>
                    <span className="text-xs">Add Photo</span>
                </div>
            )}
        </div>
    );
};

export default PhotoWidget;
