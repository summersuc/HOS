import React, { useState, useEffect, useRef } from 'react';
import { Save, User, Sparkles, Globe, Link, Image as ImageIcon, FileText } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { triggerHaptic } from '../../../utils/haptics';
import { storageService } from '../../../services/StorageService';
import { STANDARD_TIMEZONES } from '../../../utils/timezones';

// Simple Field component reuse
const Field = ({ label, icon, children }) => (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-[16px]">{icon}</span>
            <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
        </div>
        {children}
    </div>
);

const PersonaEditor = ({ personaId, onBack }) => {
    const isNew = !personaId;
    const persona = useLiveQuery(() =>
        personaId ? db.userPersonas.get(personaId) : Promise.resolve(null)
        , [personaId]);

    const [form, setForm] = useState({
        userName: '', // This is the "True Name"
        name: '', // This is technically the "Save Slot Name" in old ID (e.g. "Knight Persona"), but user asked for "Name (True Name)". 
        // Let's keep `userName` as the display name used in chat. 
        // And `name` as identifier? Or unify.
        // User said: "Name (User or AI real name)".
        // In schema: `userName` is usually the one sent to LLM as {{user}}.
        description: '',
        avatar: '',
        timezone: 'Asia/Shanghai',
        avatarType: 'url'
    });

    const [avatarPreview, setAvatarPreview] = useState(null);
    const isLoaded = useRef(false);

    useEffect(() => {
        if (persona && (!isLoaded.current || persona.id !== form.id)) {
            setForm({
                ...persona,
                avatarType: persona.avatar instanceof Blob ? 'local' : 'url',
                timezone: persona.timezone || 'Asia/Shanghai'
            });
            isLoaded.current = true;
        }
    }, [persona]);

    // Handle Blob Preview
    useEffect(() => {
        let url;
        let unsubscribe;

        const updatePreview = () => {
            if (form.avatar instanceof Blob) {
                if (url) URL.revokeObjectURL(url);
                url = URL.createObjectURL(form.avatar);
                setAvatarPreview(url);
            } else {
                if (typeof form.avatar === 'string' && form.avatar.startsWith('idb:')) {
                    const cached = storageService.getCachedBlobUrl(form.avatar);
                    setAvatarPreview(cached || null);
                } else {
                    setAvatarPreview(form.avatar || null);
                }
            }
        };

        updatePreview();

        if (typeof form.avatar === 'string' && form.avatar.startsWith('idb:')) {
            unsubscribe = storageService.subscribe(() => {
                updatePreview();
            });
        }

        return () => {
            if (url) URL.revokeObjectURL(url);
            if (unsubscribe) unsubscribe();
        };
    }, [form.avatar]);

    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 500;
                    let width = img.width; let height = img.height;
                    if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
                    else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Canvas toBlob failed')); }, 'image/jpeg', 0.8);
                };
            };
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const blob = await compressImage(file);
                setForm(prev => ({ ...prev, avatar: blob, avatarType: 'local' }));
            } catch (err) {
                alert('图片处理失败');
            }
        }
    };

    const handleSave = async () => {
        if (!form.userName) return alert('请输入你的名字');

        triggerHaptic();
        let targetId = personaId;
        const dataToSave = { ...form, updatedAt: Date.now() };
        delete dataToSave.avatarType;

        try {
            if (isNew) {
                dataToSave.createdAt = Date.now();
                targetId = await db.userPersonas.add(dataToSave);
            } else {
                await db.userPersonas.update(personaId, dataToSave);
            }
            if (form.avatar instanceof Blob) {
                await storageService.saveBlob('userPersonas', targetId, form.avatar);
            }
        } catch (e) {
            console.error('Save failed', e);
            alert('保存失败');
            return;
        }
        onBack();
    };

    const rightButton = (
        <button onClick={handleSave} className="px-3 py-1.5 bg-transparent text-gray-900 dark:text-gray-100 text-[16px] font-semibold active:opacity-50 transition-opacity">
            保存
        </button>
    );

    return (
        <IOSPage title={isNew ? '新建人设' : '编辑人设'} onBack={onBack} rightButton={rightButton}>
            <div className="pb-24 bg-[#F2F2F7] dark:bg-black min-h-full">

                {/* Header / Avatar Area */}
                <div className="mx-4 mt-4 bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-200/50 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 to-gray-500"></div>
                    <div className="flex items-center gap-4">
                        {/* Clickable Avatar Area */}
                        <div className="relative group shrink-0">
                            <div
                                onClick={() => {
                                    triggerHaptic();
                                    // Toggle between local upload and URL input, or open a mini-menu
                                    // For simplicity and better UX: If user clicks, we can show a small popover or just Cycle/Alert?
                                    // User said: "Click avatar -> 2 options".
                                    // Let's implement a simple "Selection Mode" visual.
                                    // We will use a standard HTML select helper or just two distinct touch zones nearby? 
                                    // No, let's make a small absolute overlay menu appear on click, or use a "Mode Switcher" below.
                                    // Actually, let's keep it simple: A Hidden File Input triggers on click, 
                                    // but we also need a way to switch to URL.
                                    // Start with File Trigger as primary. Use long press or small button for URL.
                                    // OR: Use a small segmented control below avatar.
                                    // User said: "Header layout strange... Click avatar should be 2 options".
                                }}
                                className="w-[76px] h-[76px] rounded-full bg-gray-100 dark:bg-[#2C2C2E] overflow-hidden border-4 border-white dark:border-[#2C2C2E] shadow-lg flex items-center justify-center cursor-pointer relative"
                            >
                                {avatarPreview ? (
                                    <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <User size={32} className="text-gray-300" />
                                )}

                                {/* Overlay Edit Icon */}
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white font-medium text-xs">编辑</span>
                                </div>
                            </div>

                            {/* Option Buttons (Floating below, cleaner) */}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                                <button
                                    onClick={() => setForm(f => ({ ...f, avatarType: 'local' }))}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md border border-white dark:border-black transition-all ${form.avatarType === 'local' ? 'bg-gray-500 text-white scale-110' : 'bg-white dark:bg-[#3A3A3C] text-gray-400'}`}
                                >
                                    <ImageIcon size={12} strokeWidth={2.5} />
                                    {/* Hidden File Input Linked to this button mode */}
                                    {form.avatarType === 'local' && (
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                                    )}
                                </button>
                                <button
                                    onClick={() => setForm(f => ({ ...f, avatarType: 'url' }))}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md border border-white dark:border-black transition-all ${form.avatarType === 'url' ? 'bg-gray-500 text-white scale-110' : 'bg-white dark:bg-[#3A3A3C] text-gray-400'}`}
                                >
                                    <Link size={12} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3 min-w-0 pt-2">
                            <div className="relative">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">你的名字</label>
                                <input
                                    type="text"
                                    value={form.userName}
                                    onChange={e => setForm({ ...form, userName: e.target.value })}
                                    placeholder="输入名字..."
                                    className="w-full text-[22px] font-bold bg-transparent placeholder-gray-300 dark:text-white focus:outline-none"
                                />
                            </div>

                            {/* URL Input Animation */}
                            {form.avatarType === 'url' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <input
                                        type="text"
                                        value={form.avatar}
                                        onChange={e => setForm({ ...form, avatar: e.target.value })}
                                        placeholder="粘贴图片链接..."
                                        className="w-full text-[14px] bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 border border-transparent transition-all"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mx-4 mt-5 space-y-4">
                    {/* Identifier Name (Optional, but useful for list view) */}
                    <Field label="存档名称 (用于区分)" icon={<Sparkles size={16} className="text-gray-400" />}>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="例如: 魔法师人设, 现代人设..."
                            className="w-full bg-transparent text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none"
                        />
                    </Field>

                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                            <Globe size={16} className="text-gray-500" />
                            <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">所在时区</label>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3">
                            <select
                                value={form.timezone || 'Asia/Shanghai'}
                                onChange={e => setForm({ ...form, timezone: e.target.value })}
                                className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-white focus:outline-none appearance-none truncate"
                            >
                                {STANDARD_TIMEZONES.map(tz => (
                                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <Field label="人物详细设定 / 背景故事" icon={<FileText size={16} className="text-gray-500" />}>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="请尽可能详细地描述你的性格、经历、外貌特征等..."
                            className="w-full h-48 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none leading-relaxed"
                        />
                    </Field>
                </div>
            </div>
        </IOSPage>
    );
};

export default PersonaEditor;
