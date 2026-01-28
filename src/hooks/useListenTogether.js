import { useState, useEffect } from 'react';

const STORAGE_KEY = 'hos_listen_together_cid'; // Changed to store ID

export const useListenTogether = () => {
    const [activeId, setActiveId] = useState(() => {
        const val = localStorage.getItem(STORAGE_KEY);
        // Only return if valid ID (number or string)
        if (!val || val === 'null' || val === 'false') return null;
        const num = parseInt(val);
        return isNaN(num) ? val : num;
    });

    // Derived state for backward compatibility or simple checks
    const isEnabled = activeId !== null && activeId !== undefined;

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === STORAGE_KEY) {
                const val = e.newValue;
                if (!val || val === 'null' || val === 'false') {
                    setActiveId(null);
                } else {
                    const num = parseInt(val);
                    setActiveId(isNaN(num) ? val : num);
                }
            }
        };

        const handleCustomEvent = (e) => {
            // detail should be the ID
            setActiveId(e.detail);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('suki-listen-together-change', handleCustomEvent);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('suki-listen-together-change', handleCustomEvent);
        };
    }, []);

    const start = (cid) => {
        setActiveId(cid);
        localStorage.setItem(STORAGE_KEY, String(cid));
        window.dispatchEvent(new CustomEvent('suki-listen-together-change', { detail: cid }));
    };

    const stop = () => {
        setActiveId(null);
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('suki-listen-together-change', { detail: null }));
    };

    // Helper to toggle (rarely used now, logic questionable)
    const toggle = (cid) => {
        if (isEnabled) stop();
        else start(cid);
    };

    return { activeId, isEnabled, start, stop, toggle };
};
