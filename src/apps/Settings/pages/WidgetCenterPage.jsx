import React, { useState } from 'react';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { useTheme } from '../../../context/ThemeContext';
import { WidgetRegistry, WIDGET_SIZES, getWidgetSizeStyle } from '../../../components/Widgets/registry';
import { motion, AnimatePresence } from 'framer-motion';
import WidgetConfigModal from '../../../components/Widgets/WidgetConfigModal';

const WidgetCenterPage = ({ onBack }) => {
    const { addWidget } = useTheme();


    // Config Modal State
    const [configModal, setConfigModal] = useState({
        isOpen: false,
        type: null,
        size: null,
        config: null
    });

    const handleAddClick = (type, size) => {
        const config = WidgetRegistry[type];
        if (config.hasConfig) {
            setConfigModal({ isOpen: true, type, size, config });
        } else {
            doAddWidget(type, size, {});
        }
    };

    const doAddWidget = async (type, size, settings) => {
        try {
            const config = WidgetRegistry[type];
            const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);

            const newWidget = {
                id: generateId(),
                type,
                size,
                settings: settings || {},
            };

            await addWidget(newWidget);

            const toast = document.createElement('div');
            toast.className = "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-6 py-3 rounded-full backdrop-blur-md z-[200] transition-opacity duration-300 pointer-events-none fade-in-out font-medium shadow-xl";
            toast.innerText = `已添加 ${config.name}`;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 1000);
        } catch (e) {
            console.error("Add Widget Failed:", e);
            alert("添加失败: " + e.message);
        }
    };
    const [activeCategory, setActiveCategory] = useState('全部');
    const categories = ['全部', '照片', '纪念日', '音乐', '文本'];

    const widgets = Object.values(WidgetRegistry).filter(w =>
        activeCategory === '全部' || w.category === activeCategory
    );

    return (
        <>
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

            <IOSPage title="小组件中心" onBack={onBack} bgClassName="bg-gray-100 dark:bg-black">
                {/* Category Nav */}
                <div className="sticky top-0 z-20 bg-gray-100/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
                        {categories.map(cat => {
                            const isActive = activeCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                        : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Widget List */}
                <motion.div
                    className="px-4 py-4 space-y-6 pb-24"
                >
                    <AnimatePresence mode="popLayout">
                        {widgets.map(widget => (
                            <motion.div
                                layout
                                key={widget.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 shadow-sm border border-gray-100/50 dark:border-white/5 overflow-hidden"
                            >
                                {/* Header */}
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{widget.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{widget.description}</p>
                                </div>

                                {/* Sizes Scroll */}
                                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 snap-x snap-mandatory">
                                    {widget.availableSizes.map(size => {
                                        const style = getWidgetSizeStyle(size);
                                        const Component = widget.component;

                                        return (
                                            <div key={size} className="flex flex-col items-center gap-3 shrink-0 snap-center">
                                                {/* Preview Stage */}
                                                <div
                                                    className="relative group bg-gray-50 dark:bg-white/5 rounded-[22px] p-4 flex items-center justify-center border border-gray-100 dark:border-white/5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
                                                    style={{ width: style.width + 32, height: style.height + 32 }} // Add padding to stage
                                                >
                                                    <div
                                                        className="relative shadow-lg rounded-[20px] pointer-events-none transform transition-transform group-hover:scale-105 duration-500"
                                                        style={{ width: style.width, height: style.height }}
                                                    >
                                                        <Component settings={{}} size={size} />
                                                        {/* Gloss overlay */}
                                                        <div className="absolute inset-0 rounded-[20px] ring-1 ring-black/5 dark:ring-white/10" />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{size}</span>
                                                    <button
                                                        onClick={() => handleAddClick(widget.id, size)}
                                                        className="bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-[12px] font-bold px-5 py-1.5 rounded-full transition-all shadow-md shadow-blue-500/20"
                                                    >
                                                        添加
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </IOSPage>
        </>
    );
};

export default WidgetCenterPage;
