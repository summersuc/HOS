import { useState, useEffect } from 'react';

const STORAGE_KEY = 'hos_listen_together_mode';

export const useListenTogether = () => {
    const [isEnabled, setIsEnabled] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    });

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === STORAGE_KEY) {
                setIsEnabled(e.newValue === 'true');
            }
        };

        // Poll for local changes (if in same window/tab but diff component)
        // or rely on storage event for cross-tab. 
        // For same-tab cross-component, we might need a custom event or just window event.
        // Let's use a custom event dispatcher helper.

        const handleCustomEvent = (e) => {
            setIsEnabled(e.detail);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('suki-listen-together-change', handleCustomEvent);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('suki-listen-together-change', handleCustomEvent);
        };
    }, []);

    const toggle = () => {
        const newValue = !isEnabled;
        setIsEnabled(newValue);
        localStorage.setItem(STORAGE_KEY, String(newValue));

        // Dispatch local event for immediate UI update in other components
        window.dispatchEvent(new CustomEvent('suki-listen-together-change', { detail: newValue }));
    };

    const set = (value) => {
        setIsEnabled(value);
        localStorage.setItem(STORAGE_KEY, String(value));
        window.dispatchEvent(new CustomEvent('suki-listen-together-change', { detail: value }));
    }

    return { isEnabled, toggle, set };
};
