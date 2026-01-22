import React, { useState, useEffect } from 'react';
import { Save, User, Sparkles } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { triggerHaptic } from '../../../utils/haptics';

const PersonaEditor = ({ personaId, onBack }) => {
    const isNew = !personaId;
    const persona = useLiveQuery(() =>
        personaId ? db.userPersonas.get(personaId) : Promise.resolve(null)
        , [personaId]);

    const [form, setForm] = useState({
        userName: '',
        name: '',
        description: '',
        avatar: '', // Blob or String
        isActive: false
    });

    const [avatarPreview, setAvatarPreview] = useState(null);

    useEffect(() => {
        if (persona) {
            setForm(persona);
        }
    }, [persona]);

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
                    const MAX_SIZE = 500;
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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const blob = await compressImage(file);
                setForm(prev => ({ ...prev, avatar: blob }));
            } catch (err) {
                alert('图片处理失败');
            }
        }
    };

    const handleSave = async () => {
        if (!form.userName) return alert('请输入你的名字');

        triggerHaptic();
        if (isNew) {
            await db.userPersonas.add({ ...form, createdAt: Date.now() });
        } else {
            await db.userPersonas.update(personaId, form);
        }
        onBack();
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
        <IOSPage title={isNew ? '新建人设' : '编辑人设'} onBack={onBack} rightButton={rightButton}>
            <div className="p-4 pb-24 bg-[#F2F2F7] dark:bg-black min-h-full">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 space-y-5 shadow-sm border border-gray-200/50 dark:border-white/5">

                    {/* Avatar Selection */}
                    <div className="flex flex-col items-center justify-center py-2">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-[#2C2C2E] overflow-hidden border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center">
                                {avatarPreview ? (
                                    <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <User size={32} className="text-gray-300" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-[#5B7FFF] text-white p-2 rounded-full cursor-pointer shadow-lg active:scale-90 transition-transform">
                                <Sparkles size={16} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                        <p className="text-[12px] text-gray-400 mt-3">点击图标上传头像</p>
                    </div>

                    <div>
                        <label className="text-[12px] font-medium text-gray-500 mb-2 block uppercase tracking-wide">我的名字 <span className="text-[#5B7FFF]">*</span></label>
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3">
                            <User size={20} className="text-gray-400" />
                            <input
                                type="text"
                                value={form.userName}
                                onChange={e => setForm({ ...form, userName: e.target.value })}
                                placeholder="User"
                                className="flex-1 bg-transparent text-[16px] text-gray-900 dark:text-white focus:outline-none font-medium"
                            />
                        </div>
                        <p className="text-[12px] text-gray-400 mt-1.5 px-1">这是 AI 对你的称呼。</p>
                    </div>

                    <div>
                        <label className="text-[12px] font-medium text-gray-500 mb-2 block uppercase tracking-wide">人设名称</label>
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3">
                            <Sparkles size={20} className="text-gray-400" />
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="例如: 默认人设, 剑士, 魔法师"
                                className="flex-1 bg-transparent text-[16px] text-gray-900 dark:text-white focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[12px] font-medium text-gray-500 mb-2 block uppercase tracking-wide">我的人设</label>
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-xl p-4">
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="描述你的外貌、性格、能力等..."
                                className="w-full h-40 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none leading-relaxed"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </IOSPage>
    );
};
export default PersonaEditor;
