export const triggerHaptic = () => {
    // Only works if supported and allowed
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        // 10ms is a very crisp "tick" feel
        navigator.vibrate(10);
    }
};

export const wrapWithHaptic = (onClick) => {
    return (e) => {
        triggerHaptic();
        if (onClick) onClick(e);
    };
};
