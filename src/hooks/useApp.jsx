import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [activeAppId, setActiveAppId] = useState(null);
    const [minimizedApps, setMinimizedApps] = useState([]);
    const [appParams, setAppParams] = useState({});

    const openApp = (id, params = null) => {
        setActiveAppId(id);
        if (params) {
            setAppParams(prev => ({ ...prev, [id]: params }));
        }
        // 从最小化列表移除
        setMinimizedApps(prev => prev.filter(appId => appId !== id));
    };

    const closeApp = () => {
        if (activeAppId) {
            setAppParams(prev => {
                const next = { ...prev };
                delete next[activeAppId];
                return next;
            });
        }
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
            appParams,
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
