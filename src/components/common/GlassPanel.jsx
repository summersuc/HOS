import React from 'react';

const GlassPanel = ({ children, className = '' }) => {
    return (
        <div className={`backdrop-blur-xl bg-white/70 dark:bg-black/40 border border-white/50 dark:border-white/10 shadow-sm transition-colors duration-300 ${className}`}>
            {children}
        </div>
    );
};

export default GlassPanel;
