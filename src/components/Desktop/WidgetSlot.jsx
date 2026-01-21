import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { WidgetRegistry } from '../Widgets/registry';
import { motion, AnimatePresence } from 'framer-motion';

const WidgetSlot = () => {
    const { widgets } = useTheme();

    if (!widgets || widgets.length === 0) {
        // Empty State - Guided prompt? active?
        // Let's show a placeholder telling user to go to settings
        return (
            <div className="flex gap-4 h-full px-1 overflow-x-auto no-scrollbar snap-x items-center">
                <div className="w-40 h-full rounded-[25px] flex flex-col items-center justify-center bg-white/40 dark:bg-white/5 backdrop-blur-md border border-dashed border-white/30 text-gray-500 text-sm">
                    <span>长按添加组件</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-4 h-full px-1 overflow-x-auto no-scrollbar snap-x">
            <AnimatePresence>
                {widgets.map(widget => {
                    const Config = WidgetRegistry[widget.type];
                    if (!Config) return null;
                    const Component = Config.component;

                    return (
                        <motion.div
                            key={widget.id}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-40 h-full shrink-0 snap-center"
                        >
                            <Component settings={widget.settings} />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default WidgetSlot;

