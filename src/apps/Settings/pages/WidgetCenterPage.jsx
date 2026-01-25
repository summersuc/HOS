import React, { useState } from 'react';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { useTheme } from '../../../context/ThemeContext';
import { WidgetRegistry, WIDGET_SIZES, WIDGET_CATEGORIES, getWidgetSizeStyle } from '../../../components/Widgets/registry';
import { motion, AnimatePresence } from 'framer-motion';
import WidgetConfigModal from '../../../components/Widgets/WidgetConfigModal';

const WidgetCenterPage = ({ onBack }) => {
    const { addWidget } = useTheme();
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Config Modal State
    const [configModal, setConfigModal] = useState({
        isOpen: false,
        type: null,
        size: null,
        config: null
    });

    const handleAddClick = (type, size) => {
        const config = WidgetRegistry[type];
        // Check if config is needed
        if (config.hasConfig) {
            setConfigModal({
                isOpen: true,
                type: type,
                size: size,
                config: config
            });
        } else {
            // Direct add
            doAddWidget(type, size, {});
        }
    };

    const doAddWidget = async (type, size, settings) => {
        try {
            const config = WidgetRegistry[type];

            // Robust ID Gen (Safe for all envs)
            const generateId = () => {
                if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
                return Date.now().toString(36) + Math.random().toString(36).substr(2);
            };

            const newWidget = {
                id: generateId(),
                type: type,
                size: size,
                settings: settings || {},
            };

            await addWidget(newWidget);

            // Toast
            const toast = document.createElement('div');
            toast.className = "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-6 py-3 rounded-full backdrop-blur-md z-[200] transition-opacity duration-300 pointer-events-none fade-in-out";
            toast.innerText = `已添加 ${config.name}`;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 1500);
        } catch (e) {
            console.error("Add Widget Failed:", e);
            alert("添加失败: " + e.message);
        }
    };

    // Filter widgets
    const widgets = Object.values(WidgetRegistry).filter(w => {
        if (selectedCategory === 'all') return true;
        return w.category === selectedCategory;
    });

    const categories = [
        { id: 'all', label: '全部' },
        { id: WIDGET_CATEGORIES.SYSTEM, label: '系统' },
        { id: WIDGET_CATEGORIES.MEDIA, label: '媒体' },
        { id: WIDGET_CATEGORIES.TOOLS, label: '工具' },
    ];

    return (
        <IOSPage title="小组件中心" onBack={onBack} bgClassName="bg-gray-100 dark:bg-black">

            {/* Config Modal */}
            <AnimatePresence>
                {configModal.isOpen && (
                    <WidgetConfigModal
                        isOpen={configModal.isOpen}
                        onClose={() => setConfigModal({ ...configModal, isOpen: false })}
                        widgetType={configModal.type}
                        config={configModal.config}
                        onConfirm={(settings) => doAddWidget(configModal.type, configModal.size, settings)}
                    />
                )}
            </AnimatePresence>

            {/* Category Tabs */}
            <div className="px-4 pt-2 pb-4 overflow-x-auto no-scrollbar flex gap-2 sticky top-[44px] z-10 bg-gray-100/80 dark:bg-black/80 backdrop-blur-md">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${selectedCategory === cat.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-300'
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="px-4 pb-20 space-y-8">
                {widgets.map(widgetType => {
                    const Component = widgetType.component;
                    return (
                        <div key={widgetType.id} className="flex flex-col gap-3">
                            <div className="flex items-baseline justify-between px-1">
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{widgetType.name}</h3>
                                <p className="text-xs text-gray-500">{widgetType.description}</p>
                            </div>

                            {/* Horizontal Scroll for Sizes */}
                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 snap-x">
                                {widgetType.availableSizes.map(size => {
                                    const style = getWidgetSizeStyle(size);
                                    // Scale down for preview if needed, but here we try to show roughly real relative sizes
                                    // Or maybe scale everything by 0.8
                                    const scale = 0.8;
                                    const previewWidth = style.width * scale;
                                    const previewHeight = style.height * scale;

                                    return (
                                        <div key={size} className="flex flex-col gap-2 shrink-0 snap-center items-center">
                                            <div
                                                className="relative group shadow-sm rounded-[20px]"
                                                style={{ width: previewWidth, height: previewHeight }}
                                            >
                                                {/* Use a transform to scale the actual component to fit the preview box if component is fixed size?? 
                                                    Actually our widgets are w-full h-full, so they will adapt to the preview container size!
                                                */}
                                                <div className="w-full h-full pointer-events-none">
                                                    <Component settings={{}} size={size} />
                                                </div>

                                                {/* Add Overlay */}
                                                <div className="absolute inset-0 bg-black/10 dark:bg-white/5 rounded-[22px] pointer-events-none border border-black/5" />

                                                <button
                                                    onClick={() => handleAddClick(widgetType.id, size)}
                                                    className="absolute bottom-2 right-2 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <span className="text-xs text-gray-400 capitalize">{size}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </IOSPage>
    );
};

export default WidgetCenterPage;
