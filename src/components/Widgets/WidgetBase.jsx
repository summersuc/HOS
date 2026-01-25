import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * @typedef {'glass' | 'solid' | 'polaroid' | 'transparent'} WidgetVariant
 */

/**
 * Base Component for all Widgets to ensure consistent styling
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {WidgetVariant} [props.variant='glass']
 * @param {Function} [props.onClick]
 */
const WidgetBase = ({
    children,
    className,
    variant = 'glass',
    onClick
}) => {
    const baseStyles = "relative w-full h-full overflow-hidden transition-all duration-300";

    const variants = {
        glass: "bg-white/60 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-[22px]",
        solid: "bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-md rounded-[22px]",
        polaroid: "bg-white shadow-xl rounded-[4px] p-2 flex flex-col", // Polaroid is sharper, white bg
        transparent: "bg-transparent"
    };

    return (
        <motion.div
            className={clsx(baseStyles, variants[variant], className)}
            onClick={onClick}
            whileTap={{ scale: 0.98 }}
        >
            {children}
        </motion.div>
    );
};

export default WidgetBase;
