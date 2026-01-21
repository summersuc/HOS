import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [activeAppId, setActiveAppId] = useState(null);
    const [minimizedApps, setMinimizedApps] = useState([]);

    const openApp = (id) => {
        setActiveAppId(id);
        // 从最小化列表移除
        setMinimizedApps(prev => prev.filter(appId => appId !== id));
    };

    const closeApp = () => {
        setActiveAppId(null);
    };

    const minimizeApp = () => {
        if (activeAppId) {
            setMinimizedApps(prev => [...new Set([...prev, activeAppId])]);
            setActiveAppId(null);
        }
    };

    return (
        <AppContext.Provider value={{
            activeAppId,
            minimizedApps,
            openApp,
            closeApp,
            minimizeApp
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
