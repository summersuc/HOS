import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, X, Trash2, ChevronRight, Image as ImageIcon, Link, User, Globe, Sparkles, MessageCircle, Heart, FileText, Book } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { triggerHaptic } from '../../../utils/haptics';
import { storageService } from '../../../services/StorageService';
import { STANDARD_TIMEZONES } from '../../../utils/timezones';

// Simple Field component
const Field = ({ label, icon, children }) => (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-[16px]">{icon}</span>
            <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
        </div>
        {children}
    </div>
);

const CharacterEditor = ({ characterId, onBack, onStartChat }) => {
    const isNew = !characterId;
    const character = useLiveQuery(() =>
        characterId ? db.characters.get(characterId) : Promise.resolve(null)
        , [characterId]);

    const boundWorldBooks = useLiveQuery(() =>
        characterId ? db.worldBookEntries.where('characterId').equals(parseInt(characterId) || -1).toArray() : Promise.resolve([])
        , [characterId]);

    const [form, setForm] = useState({
        name: '',
        nickname: '', // Remark
        avatar: '',
        description: '',
        relationship: '',
        firstMessage: '', // Kept as it is essential for LLM chat start
        timezone: 'Asia/Shanghai',
        avatarType: 'url',
    });

    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);
    const urlInputRef = useRef(null);

    // Initial Load
    useEffect(() => {
        if (character) {
            setForm({
                ...character,
                avatarType: character.avatar instanceof Blob ? 'local' : 'url',
                avatar: character.avatar || '',
                timezone: character.timezone || 'Asia/Shanghai',
                nickname: character.nickname || '',
                relationship: character.relationship || '',
                firstMessage: character.firstMessage || '',
                description: character.description || ''
            });
        }
    }, [character]);

    // Blob Preview Effect
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
                    setAvatarPreview(cached || null); // If miss, set null, NEVER raw string
                } else {
                    setAvatarPreview(form.avatar || null);
                }
            }
        };

        updatePreview();

        // Subscribe to cache updates if using a reference
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

    // Image Compression Helper
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
                    let width = img.width;
                    let height = img.height;
                    if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
                    else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Canvas toBlob failed')); }, 'image/jpeg', 0.8);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!form.name) return alert('请输入姓名');

        const data = { ...form, updatedAt: Date.now() };
        delete data.avatarType;

        // Separate Blob from main payload to prevent iOS DB crash
        let blobToSave = null;
        if (data.avatar instanceof Blob) {
            blobToSave = data.avatar;
            delete data.avatar; // Don't save Blob directly in first pass
        }

        try {
            let id = characterId;
            if (isNew) {
                id = await db.characters.add({ ...data, createdAt: Date.now() });
            } else {
                await db.characters.update(id, data);
            }

            if (blobToSave) {
                // 1. Save to dedicated 'blobs' table (Prevent iOS corruption on main table)
                await storageService.saveBlob('blobs', id, blobToSave, 'data');

                // 2. Update character with reference
                const ref = `idb:blobs:${id}`;
                await db.characters.update(id, { avatar: ref });
            } else if (data.avatarLink) {
                // Handle URL case if needed, but 'avatar' field in data should cover it if string
            }
            triggerHaptic();
            if (onStartChat && isNew) {
                const existing = await db.conversations.where({ characterId: id }).first();
                if (existing) {
                    onStartChat(existing.id, id);
                } else {
                    const convId = await db.conversations.add({ characterId: id, title: data.nickname || data.name, updatedAt: Date.now() });
                    onStartChat(convId, id);
                }
            } else {
                onBack();
            }
        } catch (e) {
            console.error(e);
            alert('保存失败: ' + e.message);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const blob = await compressImage(file);
                handleChange('avatar', blob);
                handleChange('avatarType', 'local');
            } catch (err) {
                alert('图片处理失败');
            }
        }
    };

    const rightButton = (
        <button onClick={handleSave} className="px-3 py-1.5 bg-transparent text-gray-900 dark:text-gray-100 text-[16px] font-semibold active:opacity-50 transition-opacity">
            保存
        </button>
    );

    return (
        <IOSPage title={isNew ? '添加联系人' : '编辑联系人'} onBack={onBack} rightButton={rightButton}>
            <div className="pb-24 bg-[#F2F2F7] dark:bg-black min-h-full">
                {/* Header / Avatar Area */}
                <div className="mx-4 mt-4 bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-200/50 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 to-gray-500"></div>
                    <div className="flex items-center gap-4">
                        {/* Clickable Avatar Area (Synced with PersonaEditor) */}
                        <div className="relative group shrink-0">
                            <div
                                onClick={() => {
                                    triggerHaptic();
                                    fileInputRef.current?.click();
                                }}
                                className="w-[84px] h-[84px] rounded-full bg-gray-100 dark:bg-[#2C2C2E] overflow-hidden border-4 border-white dark:border-[#2C2C2E] shadow-lg flex items-center justify-center cursor-pointer relative active:scale-95 transition-transform"
                            >
                                {avatarPreview ? (
                                    <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <User size={36} className="text-gray-300" />
                                )}
                            </div>

                            {/* Hidden File Input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>

                        <div className="flex-1 space-y-3 min-w-0 pt-2">
                            <div className="relative">
                                {/* Avatar Source Selection Removed as per user feedback */}
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">联系人姓名</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="输入姓名..."
                                    className="w-full text-[22px] font-bold bg-transparent placeholder-gray-300 dark:text-white focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* New URL Input Row - "往下挪一点" */}
                    <div className="mt-6 flex items-center gap-2 scale-95 origin-left">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3A3A3C] shadow-sm flex items-center justify-center shrink-0 border border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400">
                            <Link size={14} strokeWidth={2.5} />
                        </div>
                        <input
                            ref={urlInputRef}
                            type="text"
                            value={form.avatarType === 'url' ? form.avatar : ''}
                            onChange={e => {
                                handleChange('avatarType', 'url');
                                handleChange('avatar', e.target.value);
                            }}
                            placeholder="粘贴图片链接..."
                            className="flex-1 text-[13px] bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none border border-gray-200 dark:border-white/5 transition-all"
                        />
                        <button
                            onClick={() => {
                                triggerHaptic();
                                handleChange('avatarType', 'url');
                                alert('链接已应用！');
                            }}
                            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-[12px] font-bold rounded-xl active:scale-95 transition-transform shrink-0"
                        >
                            确定
                        </button>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="mx-4 mt-5 space-y-4">

                    <Field label="备注名 (聊天列表显示)" icon={<Sparkles size={16} className="text-orange-500" />}>
                        <input
                            type="text"
                            value={form.nickname}
                            onChange={e => handleChange('nickname', e.target.value)}
                            placeholder=""
                            className="w-full bg-transparent text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none"
                        />
                    </Field>

                    <Field label="与用户的关系" icon={<Heart size={16} className="text-pink-500" />}>
                        <input
                            type="text"
                            value={form.relationship}
                            onChange={e => handleChange('relationship', e.target.value)}
                            placeholder="例如：青梅竹马、死对头、陌生人..."
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
                                onChange={e => handleChange('timezone', e.target.value)}
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
                            onChange={e => handleChange('description', e.target.value)}
                            placeholder="请尽可能详细地描述角色的性格、经历、外貌特征等..."
                            className="w-full h-48 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none leading-relaxed"
                        />
                    </Field>


                    {/* World Book (Read Only) */}
                    {boundWorldBooks?.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 px-1">关联的世界书</h3>
                            <div className="space-y-2">
                                {boundWorldBooks.map(entry => (
                                    <div key={entry.id} className="bg-white dark:bg-[#1C1C1E] p-3 rounded-xl border border-gray-100 dark:border-white/5 flex items-center gap-3">
                                        <Book size={16} className="text-gray-400" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-[13px] text-gray-900 dark:text-white truncate">{entry.title}</div>
                                            <div className="text-[11px] text-gray-500 truncate">{entry.keys}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </IOSPage>
    );
};

export default CharacterEditor;
