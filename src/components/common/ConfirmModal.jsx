import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "移除", cancelText = "取消" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onCancel} />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl w-64 rounded-[14px] shadow-xl overflow-hidden text-center z-10"
            >
                <div className="p-4 pt-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
                    {message && <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>}
                </div>
                <div className="flex border-t border-gray-300/50 dark:border-white/10">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 text-blue-500 font-medium active:bg-gray-200 dark:active:bg-white/10 border-r border-gray-300/50 dark:border-white/10"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 text-red-500 font-medium active:bg-gray-200 dark:active:bg-white/10"
                    >
                        {confirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmModal;
