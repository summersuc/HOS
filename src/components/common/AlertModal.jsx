import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, AlertTriangle } from 'lucide-react';

const AlertModal = ({ isOpen, title, content, onClose }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/10 transition-colors" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl w-full max-w-sm rounded-[24px] shadow-2xl flex flex-col overflow-hidden border border-white/20 dark:border-white/10"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 flex justify-between items-center bg-white/10 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle size={22} className="text-red-500" />
                                {title || '提示'}
                            </h3>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[50vh] overflow-y-auto">
                            <div className="bg-gray-100/50 dark:bg-black/30 rounded-xl p-4 font-mono text-sm text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap select-text selection:bg-red-500/30 border border-black/5 dark:border-white/5">
                                {content}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 pt-0 flex gap-3">
                            <button
                                onClick={handleCopy}
                                className="flex-1 py-3 rounded-xl bg-gray-100/80 dark:bg-[#2C2C2E]/80 text-gray-800 dark:text-white font-medium active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-[#3A3A3C]"
                            >
                                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="opacity-70" />}
                                {copied ? '已复制' : '复制报错'}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl bg-[#5B7FFF] text-white font-bold active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
                            >
                                关闭
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AlertModal;
