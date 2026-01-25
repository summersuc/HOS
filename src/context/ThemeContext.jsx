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
    const [fontSize, setFontSizeState] = useState(16);

    // Initial Load Logic
    useEffect(() => {
        const loadSettings = async () => {
            // Font Config
            const localFont = localStorage.getItem('hos_system_font');
            if (localFont) applyFont(JSON.parse(localFont), false);

            // Font Size
            const localSize = localStorage.getItem('hos_font_size');
            if (localSize) {
                const s = parseInt(localSize);
                setFontSizeState(s);
                document.documentElement.style.fontSize = `${s}px`;
            } else {
                // Try DB
                const dbSize = await getSetting('global_font_size');
                if (dbSize) {
                    setFontSizeState(dbSize);
                    document.documentElement.style.fontSize = `${dbSize}px`;
                }
            }
        };
        loadSettings();
    }, []);

    const setFontSize = (size) => {
        setFontSizeState(size);
        document.documentElement.style.fontSize = `${size}px`;
    }

    const saveFontSize = (size) => {
        localStorage.setItem('hos_font_size', size);
        setSetting('global_font_size', size);
    };

    const applyFont = (fontConfig, save = true) => {
        setCurrentFont(fontConfig);
        if (save) setSetting('systemFont', fontConfig);

        const fontSource = fontConfig.source || fontConfig.url || fontConfig.value;
        const isCustom = fontConfig.type === 'web' || fontConfig.type === 'local';
        const isCode = fontConfig.type === 'code';

        // Clear and cleanup
        const oldStyle = document.getElementById('dynamic-font-style');
        if (oldStyle) oldStyle.remove();

        let container = document.getElementById('hos-font-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'hos-font-container';
            container.style.display = 'none';
            document.head.appendChild(container);
        }
        container.innerHTML = ''; // Full cleanup of previous injections

        if (isCustom) {
            const styleTag = document.createElement('style');
            styleTag.id = 'dynamic-font-style';
            const familyName = 'CustomSysFont';
            const srcValue = fontSource.startsWith('data:') ? `url('${fontSource}')` : `url('${fontSource}')`;

            styleTag.textContent = `
                @font-face {
                    font-family: '${familyName}';
                    src: ${srcValue} format('truetype');
                    font-weight: normal;
                    font-style: normal;
                    font-display: swap; 
                }
            `;
            container.appendChild(styleTag);
            document.documentElement.style.setProperty('--system-font', "'CustomSysFont', sans-serif");
        } else if (isCode) {
            // Raw Injection Mode
            const codeContent = fontConfig.code || fontSource;

            // Heuristic: If there are no HTML tags, assume it's raw CSS and wrap it
            if (!codeContent.trim().startsWith('<') && !codeContent.includes('</')) {
                const styleTag = document.createElement('style');
                styleTag.textContent = codeContent;
                container.appendChild(styleTag);
            } else {
                container.innerHTML = codeContent;
            }

            if (fontConfig.familyName) {
                document.documentElement.style.setProperty('--system-font', `"${fontConfig.familyName}", sans-serif`);
            }
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

    const addSavedFont = async (fontObj) => {
        // Now accepts an object with { name, source, type, code, familyName }
        // Optimistic UI update
        setSavedFonts(prev => [...prev, fontObj]);
        try {
            await db.fonts.add(fontObj);
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

    // Robust ID generator
    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    useEffect(() => {
        const load = async () => {
            // Load widgets and order in parallel
            const [items, order] = await Promise.all([
                db.widgets.toArray(),
                getSetting('widget_order', [])
            ]);

            // Filter bad data
            const validItems = items.filter(i => i && i.id);

            // Sort
            if (order && order.length > 0) {
                validItems.sort((a, b) => {
                    const indexA = order.indexOf(a.id);
                    const indexB = order.indexOf(b.id);
                    // If both are in order list, sort by index
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    // If one is missing, put it at the end
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return 0;
                });
            }
            setWidgets(validItems);
        };
        load().catch(e => console.warn('Widgets Load failed', e));
    }, []);

    const reloadWidgets = async () => {
        const [items, order] = await Promise.all([
            db.widgets.toArray(),
            getSetting('widget_order', [])
        ]);
        const validItems = items.filter(i => i && i.id);
        if (order && order.length > 0) {
            validItems.sort((a, b) => {
                const indexA = order.indexOf(a.id);
                const indexB = order.indexOf(b.id);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return 0;
            });
        }
        setWidgets(validItems);
    };

    // Save new order
    const reorderWidgets = async (newWidgets) => {
        // Optimistic update
        setWidgets(newWidgets);
        // Extract IDs
        const ids = newWidgets.map(w => w.id);
        await setSetting('widget_order', ids);
    };

    // Note: To make widgets truly reactive in Safe Mode without liveQuery, 
    // we would need a global event bus or Context reload trigger. 
    // For now, let's assume WidgetCenterPage will handle its own updates or refresh this context.
    // Ideally, we add a reloadWidgets() exposed function.



    const addWidget = async (widget) => {
        // Defensive: Ensure ID
        const widgetWithId = {
            ...widget,
            id: widget.id || generateId()
        };

        // Optimistic
        setWidgets(prev => [...prev, widgetWithId]);

        try {
            await db.widgets.add(widgetWithId);
            // Append to order
            const currentOrder = await getSetting('widget_order', []);
            const newOrder = [...currentOrder, widgetWithId.id];
            await setSetting('widget_order', newOrder);
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
            fontSize, setFontSize, saveFontSize,
            widgets,
            addWidget,
            removeWidget,
            reorderWidgets,
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
