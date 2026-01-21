import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import IOSPage from '../../components/AppWindow/IOSPage';

const ANNIVERSARY_TYPES = [
    { id: 'together', emoji: '❤️', label: '在一起' },
    { id: 'birthday', emoji: '🎂', label: '生日' },
    { id: 'wedding', emoji: '💒', label: '结婚纪念日' },
    { id: 'graduation', emoji: '🎓', label: '毕业纪念' },
    { id: 'travel', emoji: '✈️', label: '旅行纪念' },
    { id: 'custom', emoji: '✨', label: '自定义' },
];

const EMOJI_DRAWER_OPTIONS = [
    '❤️', '💕', '💖', '💗', '💝', '🥰', '😍', '🌹',
    '🎂', '🎁', '🎉', '🎊', '🎈', '🎀', '🍰', '🧁',
    '💒', '💍', '👰', '🤵', '💐', '🥂', '🍾', '💑',
    '🎓', '📚', '🏫', '📖', '✏️', '🎒', '🏆', '🎯',
    '✈️', '🚗', '🏝️', '🌴', '🌊', '⛰️', '🏰', '🗼',
    '⭐', '✨', '🌟', '💫', '🌙', '☀️', '🌈', '🦋',
];

const AnniversaryPage = ({ onBack }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // 获取所有纪念日
    const anniversaries = useLiveQuery(
        () => db.anniversaries.orderBy('date').toArray()
    );

    const calculateDays = (dateStr, mode = 'countUp') => {
        const targetDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        if (mode === 'countdown') {
            const thisYear = today.getFullYear();
            let nextOccurrence = new Date(thisYear, targetDate.getMonth(), targetDate.getDate());
            if (nextOccurrence < today) {
                nextOccurrence = new Date(thisYear + 1, targetDate.getMonth(), targetDate.getDate());
            }
            const diffTime = nextOccurrence - today;
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
            // Count Up / Together
            const diffTime = today - targetDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 ? diffDays : 0;
        }
    };

    const getTypeInfo = (item) => {
        const preset = ANNIVERSARY_TYPES.find(t => t.id === item.type);
        return {
            emoji: item.customIcon || preset?.emoji || '✨',
            label: item.title || preset?.label || '纪念日'
        };
    };

    const handleDelete = async (id) => {
        if (confirm('确定要删除这个纪念日吗？')) {
            await db.anniversaries.delete(id);
        }
    };

    return (
        <IOSPage
            title="纪念日"
            onBack={onBack}
            rightButton={
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setIsEditing(true);
                    }}
                    className="p-2 text-[#F48FB1]"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            }
        >
            <div className="p-4 space-y-4">
                {(anniversaries || []).length > 0 ? (
                    (anniversaries || []).map((item, index) => {
                        const typeInfo = getTypeInfo(item);
                        const days = calculateDays(item.date, item.countMode);
                        const isCountUp = item.countMode !== 'countdown';

                        // 动态背景样式
                        const hasBgImage = !!item.backgroundImage;
                        const cardStyle = hasBgImage ? {
                            backgroundImage: `url(${item.backgroundImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        } : {};

                        // 遮罩样式
                        let overlayClass = "bg-gradient-to-br from-[#F48FB1] to-[#FAD0C4]";
                        if (hasBgImage) {
                            if (item.overlayStyle === 'none') overlayClass = "bg-black/20"; // 稍微暗一点保证文字可见
                            else if (item.overlayStyle === 'blur') overlayClass = "bg-black/30 backdrop-blur-sm";
                            else if (item.overlayStyle === 'gradient') overlayClass = "bg-gradient-to-t from-black/80 via-black/20 to-transparent";
                            else overlayClass = "bg-black/40"; // default fallback
                        }

                        // 渲染图标
                        const renderIcon = (iconStr, sizeClass = "w-8 h-8", textClass = "text-2xl") => {
                            if (iconStr?.startsWith('http') || iconStr?.startsWith('data:')) {
                                return <img src={iconStr} className={`${sizeClass} object-cover rounded-lg`} alt="" />;
                            }
                            return <span className={textClass}>{iconStr}</span>;
                        };

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative overflow-hidden rounded-2xl shadow-xl min-h-[160px]"
                                style={cardStyle}
                                onClick={() => {
                                    setEditingItem(item);
                                    setIsEditing(true);
                                }}
                            >
                                {/* 背景遮罩 */}
                                <div className={`absolute inset-0 ${overlayClass} z-0 pointer-events-none transition-all duration-300`} />

                                {/* 装饰背景图标 (仅纯色模式显示) */}
                                {!hasBgImage && (
                                    <div className="absolute top-0 right-0 text-[120px] opacity-10 select-none flex items-center justify-center pointer-events-none z-0">
                                        {renderIcon(typeInfo.emoji, "w-40 h-40", "text-[120px] filter grayscale brightness-200 opacity-20")}
                                    </div>
                                )}

                                <div className="relative z-10 p-6 text-white h-full flex flex-col justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-lg shadow-sm">
                                            {renderIcon(typeInfo.emoji)}
                                        </div>
                                        <span className="font-semibold text-lg text-shadow-sm">{item.title}</span>
                                    </div>

                                    <div className="text-center my-2">
                                        <p className="text-6xl font-black mb-1 tracking-tight text-shadow-lg drop-shadow-md">
                                            {days}
                                        </p>
                                        <p className="text-sm font-bold opacity-90 uppercase tracking-widest text-shadow-sm">
                                            {isCountUp ? 'DAYS AGO' : 'DAYS TO GO'}
                                        </p>
                                    </div>

                                    <p className="text-xs opacity-80 text-center font-medium">
                                        {new Date(item.date).toLocaleDateString('zh-CN', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })} 开始
                                    </p>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(item.id);
                                    }}
                                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full active:scale-90 transition-all z-20"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="text-center py-16">
                        <p className="text-6xl mb-4">❤️</p>
                        <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium">记录每一个心动瞬间</p>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-8 py-3 bg-[#F48FB1] text-white rounded-full font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all"
                        >
                            添加纪念日
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isEditing && (
                    <AnniversaryEditor
                        item={editingItem}
                        onClose={() => setIsEditing(false)}
                        onSave={() => setIsEditing(false)}
                    />
                )}
            </AnimatePresence>
        </IOSPage>
    );
};

const AnniversaryEditor = ({ item, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: item?.title || '',
        date: item?.date || new Date().toISOString().split('T')[0],
        type: item?.type || 'together',
        customIcon: item?.customIcon || '',
        countMode: item?.countMode || 'countUp', // countUp | countdown
        backgroundImage: item?.backgroundImage || '',
        overlayStyle: item?.overlayStyle || 'blur', // none | blur | gradient
    });
    const [showIconDrawer, setShowIconDrawer] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [showTextInput, setShowTextInput] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const fileInputRef = useRef(null);
    const bgInputRef = useRef(null);

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            alert('请输入纪念日名称');
            return;
        }

        const data = {
            ...formData,
            title: formData.title.trim(),
            updatedAt: new Date().toISOString()
        };

        if (item?.id) {
            await db.anniversaries.update(item.id, data);
        } else {
            data.createdAt = new Date().toISOString();
            await db.anniversaries.add(data);
        }

        onSave();
    };

    const handleFileUpload = (e, field) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, [field]: reader.result }));
                if (field === 'customIcon') setShowIconDrawer(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCustomValueSubmit = () => {
        if (inputValue.trim()) {
            setFormData(prev => ({ ...prev, customIcon: inputValue.trim() }));
            setShowUrlInput(false);
            setShowTextInput(false);
            setShowIconDrawer(false);
        }
    };

    const handlePresetSelect = (type) => {
        setFormData(prev => ({
            ...prev,
            type: type.id,
            customIcon: '',
            // 默认模式切换：生日/节日等通常是倒数日，结婚/在一起通常是正数日
            countMode: (type.id === 'birthday' || type.id === 'graduation' || type.id === 'travel') ? 'countdown' : 'countUp',
            // 如果标题为空，自动填入预设名称
            title: prev.title === '' ? type.label : prev.title
        }));
    };

    const currentIcon = formData.customIcon || ANNIVERSARY_TYPES.find(t => t.id === formData.type)?.emoji;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px] flex items-end justify-center z-50 transition-colors"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-t-[32px] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6" />

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    {item ? '编辑纪念日' : '新建纪念日'}
                </h3>

                <div className="space-y-6">
                    {/* 图标预览与标题 */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowIconDrawer(true)}
                            className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center shrink-0 shadow-inner group overflow-hidden relative"
                        >
                            {currentIcon?.startsWith('http') || currentIcon?.startsWith('data:') ? (
                                <img src={currentIcon} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <span className="text-4xl group-active:scale-95 transition-transform">{currentIcon}</span>
                            )}
                            <div className="absolute inset-0 bg-black/0 active:bg-black/10 flex items-center justify-center transition-all">
                                <span className="text-white text-[10px] font-bold opacity-0 group-active:opacity-100 uppercase tracking-tighter">Tap</span>
                            </div>
                        </button>
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="纪念日名称"
                                value={formData.title}
                                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white outline-none font-medium text-lg"
                            />
                        </div>
                    </div>

                    {/* 日期选择 */}
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">日期时刻</span>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            className="bg-transparent text-gray-900 dark:text-white outline-none font-bold text-right"
                        />
                    </div>

                    {/* 计数模式选择 */}
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 flex">
                        <button
                            onClick={() => setFormData(p => ({ ...p, countMode: 'countUp' }))}
                            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${formData.countMode === 'countUp'
                                    ? 'bg-white dark:bg-gray-700 shadow-sm text-pink-500'
                                    : 'text-gray-400'
                                }`}
                        >
                            <span className="mr-1">📈</span> 正数 (在一起)
                        </button>
                        <button
                            onClick={() => setFormData(p => ({ ...p, countMode: 'countdown' }))}
                            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${formData.countMode === 'countdown'
                                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-500'
                                    : 'text-gray-400'
                                }`}
                        >
                            <span className="mr-1">⏳</span> 倒数 (倒计时)
                        </button>
                    </div>

                    {/* 背景图设置 */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 px-1 uppercase tracking-wider">卡片外观</p>

                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {/* 背景图上传 */}
                            <button
                                onClick={() => bgInputRef.current?.click()}
                                className="w-24 h-32 shrink-0 bg-gray-100 dark:bg-gray-800 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#F48FB1] transition-colors relative overflow-hidden"
                            >
                                {formData.backgroundImage ? (
                                    <img src={formData.backgroundImage} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                ) : null}
                                <span className="text-2xl relative z-10">🖼️</span>
                                <span className="text-[10px] font-bold text-gray-500 relative z-10">背景图</span>
                            </button>

                            {/* 遮罩样式选择 (仅当有背景图时显示) */}
                            {formData.backgroundImage && (
                                <>
                                    <button
                                        onClick={() => setFormData(p => ({ ...p, overlayStyle: 'none' }))}
                                        className={`w-24 h-32 shrink-0 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 relative overflow-hidden border-2 transition-all ${formData.overlayStyle === 'none' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}`}
                                    >
                                        <img src={formData.backgroundImage} className="absolute inset-0 w-full h-full object-cover" />
                                        <span className="relative z-10 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">无遮罩</span>
                                    </button>
                                    <button
                                        onClick={() => setFormData(p => ({ ...p, overlayStyle: 'blur' }))}
                                        className={`w-24 h-32 shrink-0 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 relative overflow-hidden border-2 transition-all ${formData.overlayStyle === 'blur' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}`}
                                    >
                                        <img src={formData.backgroundImage} className="absolute inset-0 w-full h-full object-cover blur-[2px]" />
                                        <div className="absolute inset-0 bg-black/30" />
                                        <span className="relative z-10 text-white text-[10px] font-bold">磨砂</span>
                                    </button>
                                    <button
                                        onClick={() => setFormData(p => ({ ...p, overlayStyle: 'gradient' }))}
                                        className={`w-24 h-32 shrink-0 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 relative overflow-hidden border-2 transition-all ${formData.overlayStyle === 'gradient' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}`}
                                    >
                                        <img src={formData.backgroundImage} className="absolute inset-0 w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <span className="relative z-10 text-white text-[10px] font-bold mt-16">渐变</span>
                                    </button>
                                </>
                            )}

                            {/* 清除背景 */}
                            {formData.backgroundImage && (
                                <button
                                    onClick={() => setFormData(p => ({ ...p, backgroundImage: '' }))}
                                    className="w-16 h-32 shrink-0 flex items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-2xl"
                                >
                                    <span className="text-xl">🗑️</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 类型快捷选择 */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-3 px-1 uppercase tracking-wider">快捷预设</p>
                        <div className="flex flex-wrap gap-2">
                            {ANNIVERSARY_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => handlePresetSelect(type)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${formData.type === type.id && !formData.customIcon
                                            ? 'bg-[#F48FB1] text-white shadow-md shadow-pink-100'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                        }`}
                                >
                                    <span>{type.emoji}</span>
                                    <span>{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full py-4 bg-[#F48FB1] text-white rounded-2xl font-bold text-lg shadow-lg shadow-pink-100 active:scale-[0.98] transition-all mt-4"
                    >
                        保存
                    </button>
                </div>

                {/* 隐藏的文件输入 */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e, 'customIcon')}
                    accept="image/*"
                    className="hidden"
                />
                <input
                    type="file"
                    ref={bgInputRef}
                    onChange={(e) => handleFileUpload(e, 'backgroundImage')}
                    accept="image/*"
                    className="hidden"
                />

                {/* 图标选择二级抽屉 (复用之前的逻辑) */}
                <AnimatePresence>
                    {showIconDrawer && (
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            onClick={e => e.stopPropagation()}
                            className="absolute inset-x-0 bottom-0 bg-white dark:bg-[#1C1C1E] rounded-t-[32px] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[60] flex flex-col max-h-[85vh]"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <button onClick={() => setShowIconDrawer(false)} className="text-blue-500 font-medium p-2 -ml-2">取消</button>
                                <h4 className="font-bold text-gray-900 dark:text-white">选择纪念图标</h4>
                                <div className="w-10" />
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-6">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center gap-2 active:bg-gray-100 transition-colors"
                                >
                                    <span className="text-2xl">🖼️</span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">本地上传</span>
                                </button>
                                <button
                                    onClick={() => { setShowUrlInput(true); setInputValue(''); }}
                                    className="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center gap-2 active:bg-gray-100 transition-colors"
                                >
                                    <span className="text-2xl">🔗</span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">图片链接</span>
                                </button>
                                <button
                                    onClick={() => { setShowTextInput(true); setInputValue(''); }}
                                    className="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center gap-2 active:bg-gray-100 transition-colors"
                                >
                                    <span className="text-2xl">⌨️</span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">输入文字</span>
                                </button>
                            </div>

                            <p className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest px-1">常用表情符号</p>
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-6 gap-3 pb-8">
                                    {EMOJI_DRAWER_OPTIONS.map((emoji, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, customIcon: emoji }));
                                                setShowIconDrawer(false);
                                            }}
                                            className="aspect-square flex items-center justify-center text-3xl hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-75"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 三级输入弹窗 (URL/文本) */}
                            <AnimatePresence>
                                {(showUrlInput || showTextInput) && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-[70] bg-white dark:bg-[#1C1C1E] rounded-t-[32px] p-6 flex flex-col"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <button onClick={() => { setShowUrlInput(false); setShowTextInput(false); }} className="text-blue-500 font-medium">返回</button>
                                            <h5 className="font-bold">{showUrlInput ? '图片 URL' : '输入自定义文字'}</h5>
                                            <div className="w-10" />
                                        </div>

                                        <input
                                            autoFocus
                                            type="text"
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            placeholder={showUrlInput ? "https://..." : "输入单个字符或文字"}
                                            className="w-full px-4 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6 outline-none text-center text-xl font-bold"
                                        />

                                        <button
                                            onClick={handleCustomValueSubmit}
                                            className="w-full py-4 bg-[#F48FB1] text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all"
                                        >
                                            确认使用
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

export default AnniversaryPage;
