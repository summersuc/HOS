import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../db/schema';
// Removed useLiveQuery to prevent app freeze when DB is locked on iOS PWA

// Helper to get a setting
const getSetting = async (key, defaultValue) => {
    const record = await db.settings.get(key);
    return record ? record.value : defaultValue;
};

// Helper to set a setting
// Helper to set a setting
const setSetting = async (key, value) => {
    // 1. Write to localStorage (Safe)
    try {
        if (key === 'systemFont') localStorage.setItem('hos_system_font', JSON.stringify(value));
    } catch (e) {
        console.warn('LocalStorage write failed', e);
    }

    // 2. Write to DB (Best Effort)
    try {
        await db.settings.put({ key, value });
    } catch (e) {
        console.warn('DB write failed', e);
    }
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // 1. Fonts
    const [currentFont, setCurrentFont] = useState({ name: 'System', value: 'ui-sans-serif, system-ui, sans-serif' });

    // Load font from DB on mount
    useEffect(() => {
        const loadFont = async () => {
            // 1. LocalStorage (Instant)
            try {
                const local = localStorage.getItem('hos_system_font');
                if (local) {
                    const parsed = JSON.parse(local);
                    applyFont(parsed, false); // false = don't double save
                }
            } catch (e) { console.warn('Local font load failed', e) }

            // 2. DB (Lazy Sync)
            try {
                const fontConfig = await getSetting('systemFont');
                if (fontConfig) {
                    applyFont(fontConfig, false);
                }
            } catch (e) { console.warn('DB font load failed', e) }
        };
        loadFont();
    }, []);

    const applyFont = (fontConfig, save = true) => {
        setCurrentFont(fontConfig);
        if (save) setSetting('systemFont', fontConfig);

        // Normalize source (legacy 'url' or new 'source')
        const fontSource = fontConfig.source || fontConfig.url || fontConfig.value;
        const isCustom = fontConfig.type === 'web' || fontConfig.type === 'local';

        if (isCustom) {
            let styleTag = document.getElementById('dynamic-font-style');
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'dynamic-font-style';
                document.head.appendChild(styleTag);
            }

            // Generate a unique family name if it's saved, or generic if temporary
            // Actually, for simplicity, let's just use "CustomSysFont" for now to always override.
            // But if we want to switch between custom fonts effectively, "CustomSysFont" is fine as long as we update src.

            console.log('Injecting font source:', fontSource);
            styleTag.textContent = `
                @font-face {
                    font-family: 'CustomSysFont';
                    src: url('${fontSource}') format('truetype');
                    font-weight: normal;
                    font-style: normal;
                }
            `;
            document.documentElement.style.setProperty('--system-font', "'CustomSysFont', sans-serif");
        } else {
            // Standard Preset
            document.documentElement.style.setProperty('--system-font', fontConfig.value);
        }
    };

    // 1.5 Saved Fonts Manager - SAFE MODE
    const [savedFonts, setSavedFonts] = useState([]);
    useEffect(() => {
        db.fonts.toArray().then(setSavedFonts).catch(e => console.warn('Fonts DB failed', e));
    }, []);

    const addSavedFont = async (name, source, type = 'web') => {
        const font = { name, source, type };
        // Optimistic UI update
        setSavedFonts(prev => [...prev, font]);
        try {
            await db.fonts.add(font);
        } catch (e) { console.warn('Add Font DB failed', e) }
    };

    const deleteSavedFont = async (id) => {
        setSavedFonts(prev => prev.filter(f => f.id !== id));
        try {
            await db.fonts.delete(id);
        } catch (e) { console.warn('Delete Font DB failed', e) }
    };

    // 2. Widgets - SAFE MODE
    const [widgets, setWidgets] = useState([]);
    useEffect(() => {
        db.widgets.toArray().then(setWidgets).catch(e => console.warn('Widgets DB failed', e));
    }, []);
    // Note: To make widgets truly reactive in Safe Mode without liveQuery, 
    // we would need a global event bus or Context reload trigger. 
    // For now, let's assume WidgetCenterPage will handle its own updates or refresh this context.
    // Ideally, we add a reloadWidgets() exposed function.

    const reloadWidgets = () => {
        db.widgets.toArray().then(setWidgets).catch(e => console.warn('Reload Widgets failed', e));
    };

    const addWidget = async (widget) => {
        // Optimistic
        setWidgets(prev => [...prev, widget]);
        try {
            await db.widgets.add(widget);
        } catch (e) { console.warn('Add Widget DB failed', e) }
    };

    const removeWidget = async (id) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
        try {
            await db.widgets.delete(id);
        } catch (e) { console.warn('Remove Widget DB failed', e) }
    };

    const clearWidgets = async () => {
        setWidgets([]);
        try {
            await db.widgets.clear();
        } catch (e) { console.warn('Clear Widgets DB failed', e) }
    }

    return (
        <ThemeContext.Provider value={{
            currentFont,
            applyFont,
            savedFonts,
            addSavedFont,
            deleteSavedFont,
            widgets,
            addWidget,
            removeWidget,
            clearWidgets
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
