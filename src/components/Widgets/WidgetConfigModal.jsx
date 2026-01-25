import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Link, Search, MapPin, Image as ImageIcon } from 'lucide-react'; // Assuming lucide-react is available
import { storageService } from '../../services/StorageService';

const WidgetConfigModal = ({ isOpen, onClose, widgetType, config, onConfirm }) => {
    const [activeTab, setActiveTab] = useState('upload'); // upload | url | city
    const [loading, setLoading] = useState(false);

    // Form States
    const [text, setText] = useState('');
    const [city, setCity] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // Helper to determine mode based on widget ID
    const isWeather = widgetType.startsWith('info.weather');
    const isPhoto = widgetType.includes('photo') || widgetType.includes('polaroid');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            // Create local preview
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setActiveTab('upload');
        }
    };

    const handleConfirm = async () => {
        setLoading(true);
        const settings = {};

        try {
            // 1. Text / General
            if (text) settings.text = text;

            // 2. Weather
            if (isWeather) {
                if (!city) {
                    alert('请输入城市名称');
                    setLoading(false);
                    return;
                }
                settings.city = city;
                // Ideally we validate city here, but for now we trust or let the widget fail gracefully
            }

            // 3. Image Logic
            if (isPhoto) {
                if (activeTab === 'upload' && imageFile) {
                    // Save to DB
                    const blobId = crypto.randomUUID();
                    // Store in 'blobs' table
                    await storageService.saveBlob('blobs', blobId, imageFile, 'data');

                    settings.imageType = 'blob';
                    settings.imagePayload = blobId;
                    // We also save a 'preview' or rely on the components to load async
                } else if (activeTab === 'url' && imageUrl) {
                    settings.imageType = 'url';
                    settings.imagePayload = imageUrl;
                } else {
                    // No image selected, maybe use default?
                    // Optional: alert user
                }
            }

            onConfirm(settings);
            onClose();
        } catch (error) {
            console.error('Config Error:', error);
            alert('配置保存失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-[#1C1C1E] w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[80vh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">配置组件</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* WEATHER CONFIG */}
                    {isWeather && (
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">城市名称</label>
                            <div className="relative">
                                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    placeholder="例如: 上海, New York"
                                    className="w-full bg-gray-100 dark:bg-black/20 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                />
                            </div>
                            <p className="text-xs text-gray-400">支持中文或英文城市名</p>
                        </div>
                    )}

                    {/* PHOTO CONFIG */}
                    {isPhoto && (
                        <div className="space-y-4">
                            {/* Tabs */}
                            <div className="flex bg-gray-100 dark:bg-black/20 p-1 rounded-xl">
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'
                                        }`}
                                >
                                    <Upload size={14} /> 本地上传
                                </button>
                                <button
                                    onClick={() => setActiveTab('url')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'url' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'
                                        }`}
                                >
                                    <Link size={14} /> 网络链接
                                </button>
                            </div>

                            {/* Upload Area */}
                            {activeTab === 'upload' && (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-video rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors overflow-hidden group relative"
                                >
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                                                <ImageIcon size={20} />
                                            </div>
                                            <span className="text-xs text-gray-400">点击选择图片 (最大 5MB)</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* URL Area */}
                            {activeTab === 'url' && (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={imageUrl}
                                        onChange={e => setImageUrl(e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full bg-gray-100 dark:bg-black/20 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-900 dark:text-white"
                                    />
                                    {imageUrl && (
                                        <div className="aspect-video rounded-xl bg-gray-100 dark:bg-black/20 overflow-hidden">
                                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Polaroid Text (Only for Polaroid) */}
                            {widgetType.includes('polaroid') && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">底部文字</label>
                                    <input
                                        type="text"
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        placeholder="写下此刻的心情..."
                                        maxLength={20}
                                        className="w-full bg-gray-100 dark:bg-black/20 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-handwriting"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-2">
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '确认添加'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default WidgetConfigModal;
