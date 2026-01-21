import React from 'react';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { useTheme } from '../../../context/ThemeContext';
import { WidgetRegistry } from '../../../components/Widgets/registry';
import { motion } from 'framer-motion';

const WidgetCenterPage = ({ onBack }) => {
    const { addWidget } = useTheme();

    const handleAdd = async (type) => {
        const config = WidgetRegistry[type];
        const newWidget = {
            type: type,
            size: config.defaultSize,
            settings: {}, // default settings
        };
        await addWidget(newWidget);
        // Maybe show toast?
        alert(`已添加 ${config.name} 到桌面`);
    };

    return (
        <IOSPage title="小组件中心" onBack={onBack}>
            <div className="p-4 grid grid-cols-2 gap-4">
                {Object.values(WidgetRegistry).map(widgetType => {
                    const Component = widgetType.component;
                    return (
                        <div key={widgetType.id} className="flex flex-col gap-2">
                            {/* Preview Card */}
                            <div className="aspect-square bg-white dark:bg-[#1C1C1E] rounded-[25px] p-2 shadow-sm relative overflow-hidden group">
                                <div className="w-full h-full pointer-events-none transform transition-transform group-hover:scale-105">
                                    <Component settings={{}} />
                                </div>

                                {/* Add Button Overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={() => handleAdd(widgetType.id)}
                                        className="bg-white text-black px-4 py-2 rounded-full font-semibold text-sm shadow-lg active:scale-95 transition-transform"
                                    >
                                        添加到桌面
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="text-center">
                                <h3 className="font-medium text-gray-900 dark:text-white">{widgetType.name}</h3>
                                <p className="text-xs text-gray-400">{widgetType.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 px-4 text-center">
                <p className="text-sm text-gray-400">更多组件正在开发中...</p>
            </div>
        </IOSPage>
    );
};

export default WidgetCenterPage;
