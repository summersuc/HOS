import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, X, Trash2, ChevronRight, Image as ImageIcon, Link, User, Globe, Sparkles, MessageCircle, Heart, FileText, Book, Music, Mic } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { triggerHaptic } from '../../../utils/haptics';
import { storageService } from '../../../services/StorageService';
import { STANDARD_TIMEZONES } from '../../../utils/timezones';
import { useHeartbeat, PRESET_SCENES } from '../data/HeartbeatContext';

// Simple Field component (Copied from Messenger)
const Field = ({ label, icon, children }) => (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-[16px]">{icon}</span>
            <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
        </div>
        {children}
    </div>
);

const LoverEditor = () => {
    const {
        currentLoverId,
        currentLover,
        setCurrentPage,
        createLover,
        updateLover,
        deleteLover,
    } = useHeartbeat();

    const isNew = !currentLoverId;
    const fileInputRef = useRef(null);
    const urlInputRef = useRef(null);

    // 表单状态
    const [form, setForm] = useState({
        name: '',
        nickname: '', // Remark / 对你的称呼
        avatar: '',
        description: '', // 详细设定
        relationship: '',
        timezone: 'Asia/Shanghai',
        avatarType: 'url',
        // Heartbeat 特有字段
        personality: '',
        appearance: '',
        firstMessage: '',
        defaultScene: 'cafe',
        userNickname: '你', // 对应 Messenger 的 nickname 概念吗？Messenger的nickname是备注名，userNickname是对用户的称呼。这里需要区分。
        // Messenger UI 只有一个 "备注名"。
        // 我们用 Messenger 的 Nickname UI 来映射 Heartbeat 的 userNickname (对你的称呼)？
        // 或者保留 Messenger 的 Nickname (备注)，而把 userNickname 放在下面？
        // 用户说：完全复制创建人设页面。Messenger 的 Nickname 是 "备注名 (聊天列表显示)"。
        // Heartbeat 的 userNickname 是 "对用户的称呼"。这两个不一样。
        // 既然要完全复制，那上面就是 "备注名"。但 Heartbeat 事实上用 name 显示在列表。
        // 让我们把 Messenger 的 "备注名" 映射为 Heartbeat 的 userNickname (对你的称呼) 似乎不太对，备注名是用户看到的，userNickname是AI喊用户的。
        // 妥协：上半部分完全复制 UI，字段映射：
        // Name -> name
        // Nickname (备注名) -> userNickname (对你的称呼) ?? 不，这意味着 AI 喊你 "备注名"。怪怪的。
        // 让我们保留 Nickname 字段在 form 里，但 Heartbeat 可能不用它。
        // 下面再加一个 "对你的称呼"。
    });

    // 修正：Messenger 的 nickname 是 remark。Heartbeat 没有 remark。
    // Heartbeat 有 userNickname (AI称呼用户)。
    // 为了即使 "完全复制" UI，我也要把字段对上。
    // Messenger UI: 
    // Field: 备注名 (聊天列表显示) -> form.nickname
    // Field: 与用户的关系 -> form.relationship
    // Field: 所在时区 -> form.timezone
    // Field: 人物详细设定 -> form.description

    // 我将保留这些 UI。Heartbeat 数据层：
    // name -> name
    // nickname -> (Heartbeat 不咋用，但可以存着或者映射到 name alias) -> 暂时存为 redundant 字段或者忽略
    // relationship -> relationship
    // description -> description
    // timezone -> (Heartbeat 不咋用)

    // Heartbeat 特有字段 (放下面):
    // active (appearance)
    // personality
    // userNickname (对你的称呼)
    // firstMessage
    // defaultScene

    const [avatarPreview, setAvatarPreview] = useState(null);

    // WorldBooks
    const boundWorldBooks = useLiveQuery(() =>
        // Heartbeat 暂不支持世界书绑定，但为了 UI 一致性，如果支持了可以写在这里。
        // 暂时返回空
        Promise.resolve([])
        , []);

    // 初始化表单
    useEffect(() => {
        if (currentLover) {
            setForm({
                name: currentLover.name || '',
                nickname: '', // Heartbeat 没存这个
                avatar: currentLover.avatar || '',
                avatarType: currentLover.avatar instanceof Blob ? 'local' : 'url',
                description: currentLover.description || '',
                relationship: currentLover.relationship || '恋人',
                timezone: 'Asia/Shanghai',

                // 特有
                personality: currentLover.personality || '',
                appearance: currentLover.appearance || '',
                firstMessage: currentLover.firstMessage || '',
                defaultScene: currentLover.currentScene || 'cafe',
                userNickname: currentLover.userNickname || '你',
                customSceneName: currentLover.customSceneName || '',
                customSceneDescription: currentLover.customSceneDescription || '',
            });
        }
    }, [currentLover]);

    // 头像预览
    useEffect(() => {
        let url;
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
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [form.avatar]);

    // 更新字段
    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    // 图片压缩
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

    // 保存
    const handleSave = async () => {
        if (!form.name.trim()) return alert('请输入姓名');

        const data = { ...form };
        delete data.avatarType;
        delete data.nickname; // Heartbeat 不存备注名
        delete data.timezone; // 暂不存时区

        let blobToSave = null;
        if (data.avatar instanceof Blob) {
            blobToSave = data.avatar;
            delete data.avatar;
        }

        try {
            let id = currentLoverId;
            if (isNew) {
                id = await createLover(data);
            } else {
                await updateLover(id, data);
            }

            if (blobToSave && id) {
                await storageService.saveBlob('blobs', id, blobToSave, 'data');
                const ref = `idb:blobs:${id}`;
                await db.lovers.update(id, { avatar: ref });
            }

            setCurrentPage('list');
            triggerHaptic();
        } catch (e) {
            console.error(e);
            alert('保存失败: ' + e.message);
        }
    };

    // 删除
    const handleDelete = async () => {
        if (!isNew && confirm(`确定要删除 ${currentLover?.name} 吗？`)) {
            await deleteLover(currentLoverId);
            setCurrentPage('list');
        }
    };

    return (
        <div className="pb-36 bg-[#F2F2F7] dark:bg-black min-h-full">
            {/* 隐藏的保存触发器，供 index.jsx 头部按钮调用 */}
            <button id="hb-save-trigger" onClick={handleSave} style={{ display: 'none' }} />

            {/* Messenger Style Header / Avatar Area */}
            <div className="mx-4 mt-4 bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-200/50 dark:border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-rose-500"></div>
                <div className="flex items-center gap-4">
                    {/* Avatar */}
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
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">恋人姓名</label>
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

                {/* URL Input Row */}
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

            {/* Messenger Style Fields */}
            <div className="mx-4 mt-5 space-y-4">

                {/* 这里的 Nickname 显示为空，因为 Heartbeat 不用，但为了 UI 一致性保留 */}
                <Field label="备注名 (仅本地显示)" icon={<Sparkles size={16} className="text-orange-500" />}>
                    <input
                        type="text"
                        value={form.nickname}
                        onChange={e => handleChange('nickname', e.target.value)}
                        placeholder="可选"
                        className="w-full bg-transparent text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none"
                    />
                </Field>

                <Field label="与用户的关系" icon={<Heart size={16} className="text-pink-500" />}>
                    <input
                        type="text"
                        value={form.relationship}
                        onChange={e => handleChange('relationship', e.target.value)}
                        placeholder="例如：青梅竹马、死对头..."
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

                {/* WorldBooks - Keeping layout structure */}
                {boundWorldBooks?.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 px-1">关联的世界书</h3>
                        {/* Wrapper content */}
                    </div>
                )}
            </div>

            {/* Heartbeat Specific Extensions */}
            <div className="mx-4 mt-8 mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200 dark:bg-white/10"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">心动专属设定</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-white/10"></div>
            </div>

            <div className="mx-4 space-y-4">
                <Field label="对你的称呼" icon={<MessageCircle size={16} className="text-purple-500" />}>
                    <input
                        type="text"
                        value={form.userNickname}
                        onChange={e => handleChange('userNickname', e.target.value)}
                        placeholder="宝贝 / 亲爱的 / 名字..."
                        className="w-full bg-transparent text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none"
                    />
                </Field>

                <Field label="外貌描写" icon={<Sparkles size={16} className="text-blue-500" />}>
                    <textarea
                        value={form.appearance}
                        onChange={e => handleChange('appearance', e.target.value)}
                        placeholder="详细的外貌特征，供AI描写时使用..."
                        className="w-full h-24 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none"
                    />
                </Field>

                <Field label="性格特点" icon={<Sparkles size={16} className="text-yellow-500" />}>
                    <textarea
                        value={form.personality}
                        onChange={e => handleChange('personality', e.target.value)}
                        placeholder="傲娇、温柔、腹黑..."
                        className="w-full h-16 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none"
                    />
                </Field>

                <Field label="开场白" icon={<MessageCircle size={16} className="text-green-500" />}>
                    <textarea
                        value={form.firstMessage}
                        onChange={e => handleChange('firstMessage', e.target.value)}
                        placeholder="第一次见面的第一句话..."
                        className="w-full h-24 bg-transparent resize-none text-[15px] text-gray-800 dark:text-white placeholder-gray-300 focus:outline-none"
                    />
                </Field>

                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-3">
                        <Music size={16} className="text-indigo-500" />
                        <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">默认约会场景</label>
                    </div>
                    <div className="hb-scene-picker">
                        {PRESET_SCENES.map(scene => (
                            <button
                                key={scene.id}
                                className={`hb-scene-option ${form.defaultScene === scene.id ? 'active' : ''}`}
                                onClick={() => handleChange('defaultScene', scene.id)}
                            >
                                <span className="hb-scene-icon">{scene.icon}</span>
                                <span className="hb-scene-name">{scene.name}</span>
                            </button>
                        ))}
                        {/* 自定义场景选项 */}
                        <button
                            className={`hb-scene-option ${(form.defaultScene === 'custom' || !PRESET_SCENES.find(s => s.id === form.defaultScene)) ? 'active' : ''}`}
                            onClick={() => handleChange('defaultScene', 'custom')}
                        >
                            <span className="hb-scene-icon">✨</span>
                            <span className="hb-scene-name">自定义</span>
                        </button>
                    </div>

                    {/* 自定义场景输入框 (仅选中自定义时显示) */}
                    {(form.defaultScene === 'custom' || !PRESET_SCENES.find(s => s.id === form.defaultScene)) && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 dark:border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">场景名称</label>
                                <input
                                    type="text"
                                    value={form.customSceneName || ''}
                                    onChange={e => handleChange('customSceneName', e.target.value)}
                                    placeholder="例如：月球基地、深海迷宫..."
                                    className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-[14px] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none border border-transparent focus:border-pink-500/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">场景描述</label>
                                <textarea
                                    value={form.customSceneDescription || ''}
                                    onChange={e => handleChange('customSceneDescription', e.target.value)}
                                    placeholder="描述一下周围的环境，AI会根据这段描述来演绎剧情..."
                                    className="w-full h-24 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-[14px] leading-relaxed text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none border border-transparent focus:border-pink-500/50 resize-none transition-colors"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete Button */}
                {!isNew && (
                    <button
                        onClick={handleDelete}
                        className="w-full py-4 mt-8 flex items-center justify-center gap-2 text-red-500 font-medium bg-red-50 dark:bg-red-900/20 rounded-2xl active:scale-95 transition-transform"
                    >
                        <Trash2 size={18} />
                        删除恋人
                    </button>
                )}
            </div>
        </div>
    );
};

export default LoverEditor;
