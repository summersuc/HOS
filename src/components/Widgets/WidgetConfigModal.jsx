import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Link as LinkIcon, Search, MapPin, Image as ImageIcon, Heart, MessageCircle, Snowflake, Palette, Trash2, Check, RefreshCw } from 'lucide-react';
import { storageService } from '../../services/StorageService';
import { db } from '../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';

// --- Helper Functions ---
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'blob_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// --- Sub-components ---

const MiniImagePicker = ({ label, value, valueType, onImageChange, onTypeChange, rounded = "rounded-full" }) => {
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [preview, setPreview] = useState('');
    const fileInputRef = useRef(null);

    // Sync state: If type becomes URL, show input
    useEffect(() => {
        if (valueType === 'url') setShowUrlInput(true);
    }, [valueType]);

    // Load preview
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (valueType === 'blob' && value) {
                const url = await storageService.getBlob('blobs', value);
                if (active && url) setPreview(url);
            } else if (valueType === 'url') {
                if (active) setPreview(value || '');
            } else {
                if (active) setPreview('');
            }
        };
        load();
        return () => { active = false; };
    }, [value, valueType]);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const blobId = generateId();
                // 1. Optimistic update (Immediate)
                const objectUrl = URL.createObjectURL(file);
                setPreview(objectUrl);

                // 2. Save
                await storageService.saveBlob('blobs', blobId, file, 'data');

                // 3. Propagate changes
                onTypeChange('blob');
                onImageChange(blobId);
                setShowUrlInput(false);
            } catch (error) {
                console.error("File Save Error:", error);
                alert("图片保存失败: " + error.message);
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-2 select-none w-full">
            <span className="text-xs font-medium text-gray-500">{label}</span>

            <div className="relative group shrink-0">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-16 h-16 ${rounded} bg-white dark:bg-white/10 border-2 border-dashed border-gray-200 dark:border-white/20 flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-500 transition-colors relative shrink-0 shadow-sm`}
                >
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    {preview ? (
                        <img draggable="false" src={preview} className="w-full h-full object-cover select-none" alt="preview" />
                    ) : (
                        <Upload size={18} className="text-gray-400" />
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[10px] text-white font-medium">更换</span>
                    </div>
                </div>
            </div>

            {/* Toggle URL */}
            <button
                onClick={() => {
                    setShowUrlInput(!showUrlInput);
                }}
                className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors shrink-0 ${showUrlInput ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <LinkIcon size={10} />
                {showUrlInput ? '收起链接' : '使用链接'}
            </button>

            {/* URL Input */}
            <AnimatePresence>
                {showUrlInput && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 32 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full overflow-hidden shrink-0"
                    >
                        <input
                            type="text"
                            value={(valueType === 'url' ? value : '') || ''}
                            onChange={(e) => {
                                onTypeChange('url');
                                onImageChange(e.target.value);
                            }}
                            placeholder="https://..."
                            className="w-[90%] mx-auto block bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-0.5 text-[10px] outline-none text-center"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SimplifiedColorPicker = ({ value, onChange }) => {
    return (
        <div className="flex items-start gap-4 select-none">
            {/* Transparent Toggle - Compact */}
            <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-gray-500 font-medium">透明</span>
                <button
                    onClick={() => onChange('transparent')}
                    className={`w-9 h-9 rounded-xl border transition-all flex items-center justify-center relative overflow-hidden ${value === 'transparent'
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                    {/* Subtle grid pattern */}
                    <div className="absolute inset-0 opacity-30"
                        style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '4px 4px' }} />

                    {value === 'transparent' && (
                        <Check size={14} className="text-blue-600 dark:text-blue-400 relative z-10" />
                    )}
                </button>
            </div>

            {/* Custom Color - Expanded */}
            <div className="flex flex-col gap-1.5 flex-1">
                <span className="text-[10px] text-gray-500 font-medium pl-1">自定义色卡</span>
                <div className="flex items-center gap-2">
                    <div className="relative shrink-0">
                        <input
                            type="color"
                            value={value === 'transparent' ? '#ffffff' : value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-9 h-9 opacity-0 absolute inset-0 cursor-pointer z-10"
                        />
                        <div className="w-9 h-9 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden transition-transform active:scale-95"
                            style={{ backgroundColor: value === 'transparent' ? '#fff' : value }}
                        />
                    </div>
                    <input
                        type="text"
                        value={value || ''}
                        onChange={e => onChange(e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2 text-xs outline-none font-mono text-gray-600 dark:text-gray-300 uppercase focus:bg-white dark:focus:bg-black/40 focus:border-blue-500/50 transition-colors"
                        placeholder="#HEX"
                    />
                </div>
            </div>
        </div>
    );
};

// Larger Image Picker for Background but Compressed
const BackgroundImagePicker = ({ value, valueType, onImageChange, onTypeChange }) => {
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState('');

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (valueType === 'blob' && value) {
                const url = await storageService.getBlob('blobs', value);
                if (active && url) setPreview(url);
            } else if (active) setPreview(valueType === 'url' ? value : '');
        };
        load();
        return () => { active = false; };
    }, [value, valueType]);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const blobId = generateId();
            // Optimistic
            setPreview(URL.createObjectURL(file));

            await storageService.saveBlob('blobs', blobId, file, 'data');
            onTypeChange('blob');
            onImageChange(blobId);
        } catch (error) {
            console.error(error);
            alert('背景图保存失败');
        }
    };

    return (
        <div className="space-y-2 select-none">
            <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-16 rounded-xl border border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors overflow-hidden relative group"
            >
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                {preview ? (
                    <>
                        <img draggable="false" src={preview} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity select-none" alt="bg" />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-800 dark:text-gray-200 select-none">
                            点击更换
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-2 text-gray-400 select-none">
                        <ImageIcon size={16} />
                        <span className="text-xs">上传背景图</span>
                    </div>
                )}
            </div>

            {/* Optional URL input for bg */}
            <input
                type="text"
                value={(valueType === 'url' ? value : '') || ''}
                onChange={e => { onTypeChange('url'); onImageChange(e.target.value); }}
                placeholder="或输入背景图片链接..."
                className="w-full bg-transparent border-b border-gray-100 dark:border-white/10 py-1 text-xs outline-none text-center text-gray-500 focus:border-blue-500 focus:text-gray-800 dark:focus:text-gray-200 transition-colors"
            />
        </div>
    );
}


const WidgetConfigModal = ({ isOpen, onClose, widgetType, config, onConfirm }) => {
    const [loading, setLoading] = useState(false);

    // --- Core States ---
    const [text, setText] = useState('');
    const [city, setCity] = useState('');

    // --- Photo Widget States ---
    const [photoImageId, setPhotoImageId] = useState('');
    const [photoImageType, setPhotoImageType] = useState('url'); // 'blob' | 'url'

    // --- Anniversary States ---
    const [anniversaryId, setAnniversaryId] = useState('');

    const [leftAvatarId, setLeftAvatarId] = useState('');
    const [leftAvatarType, setLeftAvatarType] = useState('url');
    const [rightAvatarId, setRightAvatarId] = useState('');
    const [rightAvatarType, setRightAvatarType] = useState('url');

    const [bgImageId, setBgImageId] = useState('');
    const [bgImageType, setBgImageType] = useState('url');

    const [leftMessage, setLeftMessage] = useState('');
    const [rightMessage, setRightMessage] = useState('');
    const [bgColor, setBgColor] = useState('transparent');
    const [showSnow, setShowSnow] = useState(true);

    const anniversaries = useLiveQuery(() => db.anniversaries.orderBy('date').toArray()) || [];

    if (!isOpen) return null;

    const isWeather = widgetType.startsWith('info.weather');
    const isPhoto = widgetType.includes('photo') || widgetType.includes('polaroid');
    const isAnniversary = widgetType.includes('media.anniversary');


    const handleConfirm = async () => {
        setLoading(true);
        const settings = {};

        try {
            if (text) settings.text = text;

            if (isWeather) {
                if (!city) { alert('请输入城市名称'); setLoading(false); return; }
                settings.city = city;
            }

            if (isPhoto) {
                if (photoImageId) {
                    settings.imageType = photoImageType;
                    settings.imagePayload = photoImageId;
                }
            }

            if (isAnniversary) {
                if (!anniversaryId) { alert('请选择纪念日'); setLoading(false); return; }
                settings.anniversaryId = anniversaryId;
                settings.leftMessage = leftMessage;
                settings.rightMessage = rightMessage;
                settings.bgColor = bgColor;
                settings.showSnow = showSnow;

                settings.leftAvatarType = leftAvatarType;
                settings.leftAvatarPayload = leftAvatarId;
                settings.rightAvatarType = rightAvatarType;
                settings.rightAvatarPayload = rightAvatarId;

                settings.bgImageType = bgImageType;
                settings.bgImagePayload = bgImageId;
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                // Add select-none and prevent default drag to stop accidental drags
                onDragStart={(e) => e.preventDefault()}
                className="bg-white dark:bg-[#1C1C1E] w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh] select-none"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center shrink-0">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {isAnniversary ? '配置纪念日' : '配置组件'}
                    </h3>
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
                                    value={city || ''}
                                    onChange={e => setCity(e.target.value)}
                                    placeholder="例如: 上海, New York"
                                    className="w-full bg-gray-100 dark:bg-black/20 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white select-text"
                                />
                            </div>
                        </div>
                    )}

                    {/* PHOTO CONFIG */}
                    {isPhoto && (
                        <div className="space-y-4">
                            <BackgroundImagePicker
                                value={photoImageId}
                                valueType={photoImageType}
                                onImageChange={setPhotoImageId}
                                onTypeChange={setPhotoImageType}
                            />
                            {widgetType.includes('polaroid') && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">底部文字</label>
                                    <input
                                        type="text"
                                        value={text || ''}
                                        onChange={e => setText(e.target.value)}
                                        placeholder="写下此刻的心情..."
                                        maxLength={20}
                                        className="w-full bg-gray-100 dark:bg-black/20 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-handwriting select-text"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ANNIVERSARY CONFIG */}
                    {isAnniversary && (
                        <div className="space-y-6 intro-y">
                            {/* Anniversary Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                    <Heart size={14} className="text-pink-500" /> 选择纪念日
                                </label>
                                <select
                                    value={anniversaryId || ''}
                                    onChange={e => setAnniversaryId(e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-black/20 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white appearance-none"
                                >
                                    <option value="">-- 请选择 --</option>
                                    {anniversaries.map(a => (
                                        <option key={a.id} value={a.id}>{a.title} ({a.date})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Avatars - New Split Style */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 flex justify-center">
                                    <MiniImagePicker
                                        label="左侧头像"
                                        value={leftAvatarId}
                                        valueType={leftAvatarType}
                                        onImageChange={setLeftAvatarId}
                                        onTypeChange={setLeftAvatarType}
                                    />
                                </div>
                                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 flex justify-center">
                                    <MiniImagePicker
                                        label="右侧头像"
                                        value={rightAvatarId}
                                        valueType={rightAvatarType}
                                        onImageChange={setRightAvatarId}
                                        onTypeChange={setRightAvatarType}
                                    />
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                    <MessageCircle size={14} className="text-blue-500" /> 气泡文字
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        value={leftMessage || ''}
                                        onChange={e => setLeftMessage(e.target.value)}
                                        placeholder="左侧..."
                                        className="bg-gray-100 dark:bg-black/20 rounded-xl py-2 px-3 text-sm outline-none text-center select-text"
                                    />
                                    <input
                                        type="text"
                                        value={rightMessage || ''}
                                        onChange={e => setRightMessage(e.target.value)}
                                        placeholder="右侧..."
                                        className="bg-gray-100 dark:bg-black/20 rounded-xl py-2 px-3 text-sm outline-none text-center select-text"
                                    />
                                </div>
                            </div>

                            {/* Appearance */}
                            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/10">
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2 mb-2">
                                    <Palette size={14} className="text-purple-500" /> 外观自定义
                                </label>

                                <SimplifiedColorPicker value={bgColor} onChange={setBgColor} />

                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 pl-1">背景图片</span>
                                    <BackgroundImagePicker
                                        value={bgImageId}
                                        valueType={bgImageType}
                                        onImageChange={setBgImageId}
                                        onTypeChange={setBgImageType}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-black/20 rounded-xl">
                                    <span className="text-sm font-medium flex items-center gap-2">
                                        <Snowflake size={14} className="text-blue-400" /> 下雪特效
                                    </span>
                                    <button
                                        onClick={() => setShowSnow(!showSnow)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${showSnow ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showSnow ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-2 shrink-0">
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center select-none"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '确认添加'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default WidgetConfigModal;
