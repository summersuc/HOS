import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../db/schema';
import { WidgetRegistry } from '../components/Widgets/registry';

// Helper to get a setting
const getSetting = async (key, defaultValue) => {
    const record = await db.settings.get(key);
    return record ? record.value : defaultValue;
};

// Helper to set a setting
const setSetting = async (key, value) => {
    try {
        if (key === 'systemFont') localStorage.setItem('hos_system_font', JSON.stringify(value));
    } catch (e) {
        console.warn('LocalStorage write failed', e);
    }

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

    useEffect(() => {
        const loadSettings = async () => {
            const localFont = localStorage.getItem('hos_system_font');
            if (localFont) applyFont(JSON.parse(localFont), false);

            const localSize = localStorage.getItem('hos_font_size');
            if (localSize) {
                const s = parseInt(localSize);
                setFontSizeState(s);
                document.documentElement.style.fontSize = `${s}px`;
            } else {
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

        const oldStyle = document.getElementById('dynamic-font-style');
        if (oldStyle) oldStyle.remove();

        let container = document.getElementById('hos-font-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'hos-font-container';
            container.style.display = 'none';
            document.head.appendChild(container);
        }
        container.innerHTML = '';

        if (isCustom) {
            const styleTag = document.createElement('style');
            styleTag.id = 'dynamic-font-style';
            const srcValue = fontSource.startsWith('data:') ? `url('${fontSource}')` : `url('${fontSource}')`;

            styleTag.textContent = `
                @font-face {
                    font-family: 'CustomSysFont';
                    src: ${srcValue} format('truetype');
                    font-weight: normal;
                    font-style: normal;
                    font-display: swap; 
                }
            `;
            container.appendChild(styleTag);
            document.documentElement.style.setProperty('--system-font', "'CustomSysFont', sans-serif");
        } else if (isCode) {
            const codeContent = fontConfig.code || fontSource;
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
            document.documentElement.style.setProperty('--system-font', fontConfig.value);
        }
    };

    // Saved Fonts
    const [savedFonts, setSavedFonts] = useState([]);
    useEffect(() => {
        db.fonts.toArray().then(setSavedFonts).catch(e => console.warn('Fonts DB failed', e));
    }, []);

    const addSavedFont = async (fontObj) => {
        setSavedFonts(prev => [...prev, fontObj]);
        try { await db.fonts.add(fontObj); } catch (e) { console.warn('Add Font DB failed', e) }
    };

    const deleteSavedFont = async (id) => {
        setSavedFonts(prev => prev.filter(f => f.id !== id));
        try { await db.fonts.delete(id); } catch (e) { console.warn('Delete Font DB failed', e) }
    };

    // 2. UNIFIED LAYOUT (Apps & Widgets in 4x6 Grid)
    const [desktopApps, setDesktopApps] = useState([]);
    const [dockApps, setDockApps] = useState([]);
    const [widgets, setWidgets] = useState([]); // Compatibility

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    useEffect(() => {
        const loadLayout = async () => {
            try {
                const layout = await db.layout.get('default');
                const GRID_SIZE = 24; // 4x6
                let grid = new Array(GRID_SIZE).fill(null);

                if (layout?.desktopApps && Array.isArray(layout.desktopApps)) {
                    // 异步还原所有项 (Include Dedup)
                    const seenIds = new Set();

                    const restoredGrid = await Promise.all(layout.desktopApps.map(async (item) => {
                        if (item && typeof item === 'object' && item.type === 'widgetRef') {
                            // DEDUP: If ID seen, skip this slot
                            if (seenIds.has(item.id)) return null;
                            seenIds.add(item.id);

                            // 从 widgets 表还原完整数据
                            const widgetData = await db.widgets.get(item.id);
                            if (widgetData) {
                                return { ...widgetData, type: 'widget' }; // 标记为活跃组件
                            }
                            return null; // 如果组件数据丢失，返回空位
                        }
                        return item; // App 字符串或 null 直接返回
                    }));

                    // 填充到固定大小的网格中
                    restoredGrid.forEach((item, idx) => {
                        if (idx < GRID_SIZE) grid[idx] = item;
                    });
                } else {
                    // 初始默认应用
                    const defaultApps = ['calendar', 'notes', 'heartbeat', 'games'];
                    defaultApps.forEach((app, i) => { grid[i] = app; });
                }

                setDesktopApps(grid);
                // 更新内部状态小组件列表（用于兼容旧逻辑）
                setWidgets(grid.filter(item => item && typeof item === 'object' && item.type === 'widget'));

                if (layout?.dockApps) {
                    setDockApps(layout.dockApps);
                } else {
                    const { defaultDockApps } = await import('../config/appRegistry');
                    setDockApps(defaultDockApps);
                }

                // --- Layout Auto-Repair: Ensure all Registry Apps are present ---
                setTimeout(async () => {
                    const { appRegistry } = await import('../config/appRegistry');
                    const currentDesktop = grid;
                    const currentDock = layout?.dockApps || (await import('../config/appRegistry')).defaultDockApps;

                    const presentApps = new Set([
                        ...currentDesktop.filter(i => typeof i === 'string'),
                        ...currentDock
                    ]);

                    const missingApps = Object.keys(appRegistry).filter(appId => !presentApps.has(appId));

                    if (missingApps.length > 0) {
                        console.log("Auto-adding missing apps to layout:", missingApps);
                        const nextGrid = [...currentDesktop];
                        let updated = false;

                        missingApps.forEach(appId => {
                            const firstEmpty = nextGrid.findIndex(slot => slot === null);
                            if (firstEmpty !== -1) {
                                nextGrid[firstEmpty] = appId;
                                updated = true;
                            }
                        });

                        if (updated) {
                            setDesktopApps(nextGrid);
                            saveLayout('desktop', nextGrid);
                        }
                    }
                }, 100);

            } catch (e) {
                console.error("Load Layout Failed:", e);
            }
        };
        loadLayout();
    }, []);

    const saveLayout = async (type, newOrder) => {
        if (type === 'desktop') {
            setDesktopApps(newOrder);
            setWidgets(newOrder.filter(item => item && typeof item === 'object' && item.type === 'widget'));
        }
        if (type === 'dock') setDockApps(newOrder);

        try {
            const currentLayout = (await db.layout.get('default')) || { id: 'default' };

            let dataToSave = newOrder;
            if (type === 'desktop') {
                const seenIds = new Set();
                dataToSave = newOrder.map(item => {
                    if (item && typeof item === 'object' && item.type === 'widget') {
                        // 强制去重：如果该 ID 已经存过，则这个位置留空
                        if (seenIds.has(item.id)) return null;
                        seenIds.add(item.id);
                        return { type: 'widgetRef', id: item.id };
                    }
                    return item;
                });
            }

            await db.layout.put({
                ...currentLayout,
                id: 'default',
                [type === 'desktop' ? 'desktopApps' : 'dockApps']: dataToSave
            });
        } catch (e) {
            console.warn('Save Layout Failed', e);
        }
    };

    // --- Helper for Widget Occupancy ---
    const parseWidgetSize = (sizeStr) => {
        const [w, h] = (sizeStr || '2x2').split('x').map(Number);
        return { cols: w || 2, rows: h || 2 };
    };

    const getOccupiedSlots = (index, sizeStr) => {
        const GRID_COLS = 4;
        const GRID_ROWS = 6;
        const { cols, rows } = parseWidgetSize(sizeStr);

        const slots = [];
        const startRow = Math.floor(index / GRID_COLS);
        const startCol = index % GRID_COLS;

        // Boundaries check
        if (startCol + cols > GRID_COLS || startRow + rows > GRID_ROWS) return null;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                slots.push((startRow + r) * GRID_COLS + (startCol + c));
            }
        }
        return slots;
    };

    const addWidget = async (widget) => {
        const widgetId = widget.id || generateId();
        const widgetWithId = {
            id: widgetId,
            type: 'widget',
            widgetType: widget.type || widget.widgetType,
            size: widget.size,
            settings: widget.settings || {}
        };

        // 1. Calculate space first (Local state is most fresh for this)
        const GRID_SIZE = 24;
        const occupied = new Set();
        desktopApps.forEach((item, idx) => {
            if (item && typeof item === 'object' && item.type === 'widget') {
                const slots = getOccupiedSlots(idx, item.size);
                if (slots) slots.forEach(s => occupied.add(s));
            } else if (item && typeof item === 'string') {
                occupied.add(idx);
            }
        });

        // Check if this ID already exists (Sanity check)
        const exists = desktopApps.some(i => i && typeof i === 'object' && i.id === widgetId);
        if (exists) {
            console.warn('Widget already exists on desktop');
            return;
        }

        let targetIdx = -1;
        for (let i = 0; i < GRID_SIZE; i++) {
            if (occupied.has(i)) continue;
            const slots = getOccupiedSlots(i, widgetWithId.size);
            if (slots && slots.every(s => !occupied.has(s))) {
                targetIdx = i;
                break;
            }
        }

        if (targetIdx === -1) {
            alert('桌面空间不足，无法添加小组件');
            return;
        }

        // 2. Perform DB side effect
        try {
            await db.widgets.add(widgetWithId);
        } catch (e) {
            console.warn('Add Widget DB failed', e);
            throw e;
        }

        // 3. One-shot update state & trigger layout save
        const nextGrid = [...desktopApps];
        nextGrid[targetIdx] = widgetWithId;
        await saveLayout('desktop', nextGrid);
    };

    const removeWidget = async (id) => {
        setDesktopApps(prev => {
            const next = prev.map(item => (item && item.id === id) ? null : item);
            saveLayout('desktop', next);
            return next;
        });
        try { await db.widgets.delete(id); } catch (e) { console.warn('Remove Widget DB failed', e) }
    };

    const updateWidget = async (id, newSettings) => {
        // Update State
        setDesktopApps(prev => {
            const next = prev.map(item => (item && item.id === id) ? { ...item, settings: newSettings } : item);
            // Layout doesn't strictly need saving if only settings changed, 
            // but for consistency we can save (settings are in DB, layout has refs)
            // Actually, since layout only has refs, we don't need to save layout!
            // But we DO need to update the local state so the UI reflects changes.
            return next;
        });

        // Update DB
        try {
            await db.widgets.update(id, { settings: newSettings });
        } catch (e) { console.warn('Update Widget DB failed', e) }
    };

    const resetToDefaults = async () => {
        try {
            await db.layout.clear();
            await db.widgets.clear();

            // Re-seed defaults
            const GRID_SIZE = 24;
            const grid = new Array(GRID_SIZE).fill(null);
            const defaultApps = ['calendar', 'notes', 'heartbeat', 'games'];
            defaultApps.forEach((app, i) => { grid[i] = app; });

            const { defaultDockApps } = await import('../config/appRegistry');

            setDesktopApps(grid);
            setDockApps(defaultDockApps);
            setWidgets([]);

            // Persist defaults
            await saveLayout('desktop', grid);
            await saveLayout('dock', defaultDockApps);

            // Force reload window to ensure clean slate? Not needed if state updates.
        } catch (e) {
            console.error("Reset Defaults Failed:", e);
        }
    };

    return (
        <ThemeContext.Provider value={{
            currentFont, applyFont, savedFonts, addSavedFont, deleteSavedFont,
            fontSize, setFontSize, saveFontSize,
            widgets, addWidget, removeWidget, updateWidget,
            desktopApps, setDesktopApps, dockApps, setDockApps, saveLayout,
            resetToDefaults // Expose reset
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
