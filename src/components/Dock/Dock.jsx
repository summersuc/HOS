import React from 'react';
import GlassPanel from '../common/GlassPanel';
import AppIcon from '../Desktop/AppIcon';
import { appRegistry, defaultDockApps } from '../../config/appRegistry';
import { useApp } from '../../hooks/useApp';

const Dock = () => {
    const { openApp } = useApp();

    return (
        <div className="mx-4 mb-0 px-4 py-4 flex justify-between items-center gap-4 bg-transparent">
            {defaultDockApps.map(id => {
                const app = appRegistry[id];
                if (!app) return null;
                return (
                    <div key={id} className="flex-1 flex justify-center">
                        <AppIcon
                            app={app}
                            inDock={true}
                            onClick={() => openApp(id)}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default Dock;
