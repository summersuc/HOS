import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Toast = ({ message, onClose, duration = 2000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-black rounded-full text-sm font-medium shadow-xl z-[100] whitespace-nowrap"
        >
            {message}
        </motion.div>
    );
};

export const useToast = () => {
    const [toast, setToast] = React.useState(null);

    const showToast = (msg) => {
        setToast(msg);
    };

    const ToastComponent = () => (
        <AnimatePresence>
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        </AnimatePresence>
    );

    return { showToast, ToastComponent };
};
