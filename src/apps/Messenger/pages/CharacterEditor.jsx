import React, { useState, useEffect } from 'react';
import { Camera, Save, X, Trash2, ChevronRight, Image as ImageIcon, Link } from 'lucide-react';
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
        avatar: '',
        description: '',
        relationship: '', // New Field
        firstMessage: '',
        scenario: '',
        personality: '',
        exampleDialogue: '',
        avatarType: 'url' // 'url' or 'local'
    });

    useEffect(() => {
        if (character) {
            setForm({ ...character, avatarType: character.avatar?.startsWith('blob:') ? 'local' : 'url' });
        }
    }, [character]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!form.name) return alert('请输入姓名');

        const data = {
            ...form,
            updatedAt: Date.now()
        };
        delete data.avatarType;

        let id = characterId;
        if (isNew) {
            id = await db.characters.add({ ...data, createdAt: Date.now() });
        } else {
            await db.characters.update(id, data);
        }

        triggerHaptic();
        if (onStartChat && isNew) {
            // Find or create conversation
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
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            handleChange('avatar', url);
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
                {/* Avatar & Name Card */}
                <div className="mx-4 mt-4 bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-200/50 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="w-[72px] h-[72px] rounded-2xl bg-gray-100 dark:bg-[#2C2C2E] overflow-hidden border border-gray-200 dark:border-white/10">
                                {form.avatar ? (
                                    <img src={form.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Camera size={24} />
                                    </div>
                                )}
                            </div>

                            {/* Avatar Source Toggle */}
                            <div className="absolute -bottom-2 -right-2 flex gap-1 bg-white dark:bg-[#2C2C2E] p-1 rounded-full shadow-md border border-gray-100 dark:border-white/10">
                                <button
                                    onClick={() => handleChange('avatarType', 'url')}
                                    className={`p-1.5 rounded-full transition-colors ${form.avatarType === 'url' ? 'bg-[#5B7FFF] text-white' : 'text-gray-400'}`}
                                >
                                    <Link size={12} />
                                </button>
                                <label className={`p-1.5 rounded-full transition-colors cursor-pointer ${form.avatarType === 'local' ? 'bg-[#5B7FFF] text-white' : 'text-gray-400'}`}>
                                    <ImageIcon size={12} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} onClick={() => handleChange('avatarType', 'local')} />
                                </label>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3">
                            <div>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="姓名"
                                    className="w-full text-[20px] font-bold bg-transparent placeholder-gray-300 dark:text-white focus:outline-none"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={form.nickname}
                                    onChange={e => handleChange('nickname', e.target.value)}
                                    placeholder="昵称 (显示在消息列表)"
                                    className="w-full text-[15px] bg-transparent text-gray-600 dark:text-gray-400 placeholder-gray-300 focus:outline-none"
                                />
                            </div>
                            {form.avatarType === 'url' && (
                                <input
                                    type="text"
                                    value={form.avatar}
                                    onChange={e => handleChange('avatar', e.target.value)}
                                    placeholder="输入头像 URL..."
                                    className="w-full text-[13px] bg-gray-50 dark:bg-[#2C2C2E] rounded-lg px-2 py-1.5 text-gray-600 dark:text-gray-300 focus:outline-none"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Fields */}
                <div className="mx-4 mt-5 space-y-4">
                    <Field label="人设描述" icon="📝">
                        <textarea
                            value={form.description}
                            onChange={e => handleChange('description', e.target.value)}
                            placeholder="描述角色的性格、外貌、背景故事..."
                            className="w-full h-32 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none leading-relaxed"
                        />
                    </Field>

                    {/* New Relationship Field */}
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

                    <Field label="场景设定 (Scenario)" icon="🌍">
                        <textarea
                            value={form.scenario}
                            onChange={e => handleChange('scenario', e.target.value)}
                            placeholder="当前的场景或环境描述..."
                            className="w-full h-20 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none leading-relaxed"
                        />
                    </Field>

                    <Field label="示例对话" icon="🗣️">
                        <textarea
                            value={form.exampleDialogue}
                            onChange={e => handleChange('exampleDialogue', e.target.value)}
                            placeholder="User: 你好&#10;Char: 你好呀！"
                            className="w-full h-32 bg-transparent resize-none text-[14px] font-mono text-gray-600 dark:text-gray-300 placeholder-gray-300 focus:outline-none leading-relaxed"
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
                                    await db.messengerMessages.where({ conversationId: characterId }).delete(); // Note: check DB schema for proper deletion
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
