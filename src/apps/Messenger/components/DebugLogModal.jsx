import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, ArrowDown, ArrowUp } from 'lucide-react';

const DebugLogModal = ({ isOpen, onClose, request, response }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-2xl h-[80vh] bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="shrink-0 h-14 flex items-center justify-between px-5 bg-white dark:bg-[#2C2C2E] border-b border-gray-200 dark:border-white/10">
                            <span className="font-bold text-lg text-gray-900 dark:text-white">API Debug Log</span>
                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                <X size={20} className="text-gray-500 dark:text-gray-300" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
                            {/* Request Section */}
                            <div className="flex-1 flex flex-col bg-white dark:bg-black/20 rounded-xl overflow-hidden border border-gray-200 dark:border-white/5">
                                <div className="shrink-0 h-9 flex items-center justify-between px-3 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <ArrowUp size={14} className="text-blue-500" />
                                        <span className="text-xs font-bold text-gray-500 uppercase">Request (Context)</span>
                                    </div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(request); alert('已复制 Request！'); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 active:bg-blue-500/10 transition-all"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-3 bg-gray-50/50 dark:bg-black/10">
                                    <pre className="text-[11px] font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all">
                                        {request || 'No request data'}
                                    </pre>
                                </div>
                            </div>

                            {/* Response Section */}
                            <div className="flex-1 flex flex-col bg-white dark:bg-black/20 rounded-xl overflow-hidden border border-gray-200 dark:border-white/5">
                                <div className="shrink-0 h-9 flex items-center justify-between px-3 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <ArrowDown size={14} className="text-green-500" />
                                        <span className="text-xs font-bold text-gray-500 uppercase">Response (Stream)</span>
                                    </div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(response); alert('已复制 Response！'); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-500 active:bg-green-500/10 transition-all"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-3 bg-gray-50/50 dark:bg-black/10">
                                    <pre className="text-[11px] font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all">
                                        {response || 'No response data'}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default DebugLogModal;
