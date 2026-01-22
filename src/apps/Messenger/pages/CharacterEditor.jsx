import React, { useState, useEffect } from 'react';
import { Camera, Save, X, Trash2, ChevronRight, Image as ImageIcon, Link, User } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { triggerHaptic } from '../../../utils/haptics';

const CharacterEditor = ({ characterId, onBack, onStartChat }) => {
    const isNew = !characterId;
    const character = useLiveQuery(() =>
        characterId ? db.characters.get(characterId) : Promise.resolve(null)
        , [characterId]);

    const [form, setForm] = useState({
        name: '',
        nickname: '',
        avatar: '', // Blob or String
        userAvatar: '', // Blob or String (New)
        description: '',
        relationship: '',
        firstMessage: '',
        personality: '',
        avatarType: 'url', // 'url' or 'local'
        userAvatarType: 'url' // 'url' or 'local'
    });

    const [avatarPreview, setAvatarPreview] = useState(null);
    const [userAvatarPreview, setUserAvatarPreview] = useState(null);

    // Initial Load
    useEffect(() => {
        if (character) {
            setForm({
                ...character,
                avatarType: character.avatar instanceof Blob ? 'local' : 'url',
                avatar: character.avatar || ''
            });
        }
    }, [character]);

    // Blob Preview Effect
    useEffect(() => {
        let url;
        if (form.avatar instanceof Blob) {
            url = URL.createObjectURL(form.avatar);
            setAvatarPreview(url);
        } else {
            setAvatarPreview(form.avatar);
        }
        return () => url && URL.revokeObjectURL(url);
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
                    const MAX_SIZE = 500; // Avatar doesn't need to be huge
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas toBlob failed'));
                    }, 'image/jpeg', 0.8);
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

        const data = {
            ...form,
            updatedAt: Date.now()
        };
        // Remove UI-only flags
        delete data.avatarType;
        delete data.userAvatarType;

        try {
            let id = characterId;
            if (isNew) {
                id = await db.characters.add({ ...data, createdAt: Date.now() });
            } else {
                await db.characters.update(id, data);
            }

            triggerHaptic();
            if (onStartChat && isNew) {
                const existing = await db.conversations.where({ characterId: id }).first();
                if (existing) {
                    onStartChat(existing.id, id);
                } else {
                    const convId = await db.conversations.add({ characterId: id, title: data.name, updatedAt: Date.now() });
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

    const handleImageUpload = async (e, field) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const blob = await compressImage(file);
                handleChange(field, blob);
            } catch (err) {
                alert('图片处理失败');
            }
        }
    };

    const rightButton = (
        <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-[#5B7FFF] text-white text-[14px] font-semibold rounded-full shadow-md shadow-[#5B7FFF]/20 active:scale-95 transition-transform"
        >
            保存
        </button>
    );

    return (
        <IOSPage title={isNew ? '添加联系人' : '编辑联系人'} onBack={onBack} rightButton={rightButton}>
            <div className="pb-24 bg-[#F2F2F7] dark:bg-black min-h-full">
                {/* Character Card */}
                <div className="mx-4 mt-4 bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-200/50 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#5B7FFF]"></div>
                    <div className="flex items-center gap-4">
                        <div className="relative group shrink-0">
                            <div className="w-[72px] h-[72px] rounded-2xl bg-gray-100 dark:bg-[#2C2C2E] overflow-hidden border border-gray-200 dark:border-white/10 shadow-inner">
                                {avatarPreview ? (
                                    <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Camera size={24} />
                                    </div>
                                )}
                            </div>

                            {/* Type Toggle */}
                            <div className="absolute -bottom-2 -right-2 flex gap-1 bg-white dark:bg-[#2C2C2E] p-1 rounded-full shadow-md border border-gray-100 dark:border-white/10 z-10">
                                <button
                                    onClick={() => handleChange('avatarType', 'url')}
                                    className={`p-1.5 rounded-full transition-colors ${form.avatarType === 'url' ? 'bg-[#5B7FFF] text-white' : 'text-gray-400'}`}
                                >
                                    <Link size={12} />
                                </button>
                                <label className={`p-1.5 rounded-full transition-colors cursor-pointer ${form.avatarType === 'local' ? 'bg-[#5B7FFF] text-white' : 'text-gray-400'}`}>
                                    <ImageIcon size={12} />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} onClick={() => handleChange('avatarType', 'local')} />
                                </label>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3 min-w-0">
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => handleChange('name', e.target.value)}
                                placeholder="角色姓名"
                                className="w-full text-[20px] font-bold bg-transparent placeholder-gray-300 dark:text-white focus:outline-none"
                            />
                            {form.avatarType === 'url' && (
                                <input
                                    type="text"
                                    value={form.avatar}
                                    onChange={e => handleChange('avatar', e.target.value)}
                                    placeholder="头像 URL..."
                                    className="w-full text-[13px] bg-gray-50 dark:bg-[#2C2C2E] rounded-lg px-2 py-1.5 text-gray-600 dark:text-gray-300 focus:outline-none transition-colors focus:bg-white dark:focus:bg-black border border-transparent focus:border-blue-500/30"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Fields */}
                <div className="mx-4 mt-5 space-y-4">
                    <Field label="人设描述 (Persona)" icon="📝">
                        <textarea
                            value={form.description}
                            onChange={e => handleChange('description', e.target.value)}
                            placeholder="描述角色的性格、外貌、背景故事..."
                            className="w-full h-32 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none leading-relaxed"
                        />
                    </Field>

                    <Field label="与用户的关系" icon="❤️">
                        <input
                            type="text"
                            value={form.relationship}
                            onChange={e => handleChange('relationship', e.target.value)}
                            placeholder="例如：青梅竹马、死对头、陌生人..."
                            className="w-full bg-transparent text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none"
                        />
                    </Field>

                    <Field label="第一条消息" icon="💬">
                        <textarea
                            value={form.firstMessage}
                            onChange={e => handleChange('firstMessage', e.target.value)}
                            placeholder="开始聊天时角色发送的第一句话..."
                            className="w-full h-24 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none leading-relaxed"
                        />
                    </Field>
                </div>

                {/* Delete Button */}
                {!isNew && (
                    <div className="mx-4 mt-8">
                        <button
                            onClick={async () => {
                                if (confirm('确定删除此联系人吗？聊天记录也会被删除。')) {
                                    await db.conversations.where({ characterId }).delete();
                                    await db.messengerMessages.where({ conversationId: characterId }).delete();
                                    await db.characters.delete(characterId);
                                    onBack();
                                }
                            }}
                            className="w-full py-4 bg-white dark:bg-[#1C1C1E] text-red-500 rounded-2xl font-medium shadow-sm active:scale-[0.98] transition-all"
                        >
                            删除联系人
                        </button>
                    </div>
                )}
            </div>
        </IOSPage>
    );
};

const Field = ({ label, icon, children }) => (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-200/50 dark:border-white/5">
        <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{icon}</span>
            <span className="text-[14px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        {children}
    </div>
);

export default CharacterEditor;
