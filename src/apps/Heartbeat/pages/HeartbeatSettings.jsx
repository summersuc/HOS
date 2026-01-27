import React from 'react';
import { useHeartbeat } from '../data/HeartbeatContext';
import { db } from '../../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { storageService } from '../../../services/StorageService';
import { Edit, UserCheck, Check, User } from 'lucide-react';

/**
 * 心动设置页（已移除header，由父级IOSPage提供）
 */
const HeartbeatSettings = () => {
    const {
        settings,
        setSettings,
        currentLover,
        currentLoverId,
        updateLover,
        setCurrentPage,
    } = useHeartbeat();

    const allPersonas = useLiveQuery(() => db.userPersonas.toArray()) || [];

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // 处理用户人设选择
    const handleSelectPersona = async (persona) => {
        if (!currentLoverId) return;
        await updateLover(currentLoverId, {
            userPersonaId: persona.id,
            userNickname: persona.userName || persona.name // 同步更新昵称
        });
    };

    // 获取图片URL辅助函数
    const getAvatarUrl = (blobOrUrl) => {
        if (!blobOrUrl) return null;
        if (typeof blobOrUrl === 'string') {
            if (blobOrUrl.startsWith('idb:')) {
                return storageService.getCachedBlobUrl(blobOrUrl) || blobOrUrl;
            }
            return blobOrUrl;
        }
        if (blobOrUrl instanceof Blob) {
            return URL.createObjectURL(blobOrUrl);
        }
        return null;
    };

    return (
        <div className="hb-settings-page pb-safe">
            <div className="hb-settings-list space-y-6">

                {/* 1. 当前角色编辑 */}
                {currentLover && (
                    <div className="space-y-2">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">当前角色</div>
                        <div
                            className="bg-white dark:bg-white/5 p-4 rounded-2xl flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
                            onClick={() => setCurrentPage('editor')}
                        >
                            <img
                                src={getAvatarUrl(currentLover.avatar)}
                                className="w-12 h-12 rounded-full object-cover border-2 border-pink-100 dark:border-pink-900"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-900 dark:text-white truncate">{currentLover.name}</div>
                                <div className="text-xs text-gray-500 truncate">{currentLover.description || '暂无简介...'}</div>
                            </div>
                            <div className="flex items-center text-pink-500 text-xs font-medium bg-pink-50 dark:bg-pink-900/20 px-3 py-1.5 rounded-full">
                                <Edit size={14} className="mr-1" />
                                编辑人设
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. 用户人设选择 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2">
                        <UserCheck size={14} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">我的设定 (Persona)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {allPersonas.map(p => {
                            const isSelected = currentLover?.userPersonaId === p.id;
                            const displayName = p.userName || p.name || '未命名';
                            const avatarSrc = getAvatarUrl(p.avatar);

                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelectPersona(p)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                        ? 'bg-pink-50 border-pink-200 ring-1 ring-pink-500/20 dark:bg-pink-900/20 dark:border-pink-500/30'
                                        : 'bg-white border-transparent hover:bg-gray-50 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/5'
                                        }`}
                                >
                                    <div className="relative">
                                        <img
                                            src={avatarSrc}
                                            className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800"
                                        />
                                        {isSelected && (
                                            <div className="absolute -bottom-1 -right-1 bg-pink-500 text-white rounded-full p-0.5 border-2 border-white dark:border-[#1C1C1E]">
                                                <Check size={10} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className={`text-sm font-bold truncate ${isSelected ? 'text-pink-600 dark:text-pink-300' : 'text-gray-900 dark:text-white'}`}>
                                            {displayName}
                                        </span>
                                        {p.isActive && <span className="text-[10px] text-gray-400">全局默认</span>}
                                    </div>
                                </button>
                            );
                        })}

                        {/* 添加人设引导 */}
                        <button
                            className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-gray-300 dark:border-white/10 text-gray-400 gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            onClick={() => {/* TODO: 跳转到 Messenger 的 "我" 页面，或者弹窗提示 */ }}
                        >
                            <User size={20} />
                            <span className="text-xs">去[我]添加新形象</span>
                        </button>
                    </div>
                </div>

                {/* 3. 通用设置 (原有的) */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">通用设置</div>
                    <div className="bg-white dark:bg-white/5 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5 shadow-sm">

                        {/* 亲密度调节 (仅当有角色时显示) */}
                        {currentLover && (
                            <div className="hb-settings-item px-4">
                                <div className="flex flex-col gap-1 w-full">
                                    <div className="flex justify-between items-center">
                                        <span className="hb-settings-label">当前亲密度</span>
                                        <span className="text-sm font-bold text-pink-500">{currentLover.intimacy || 0}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={currentLover.intimacy || 0}
                                        onChange={(e) => updateLover(currentLoverId, { intimacy: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500 mt-2"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400">
                                        <span>陌路(0)</span>
                                        <span>热恋(100)</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 显示模式 */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label">显示模式</span>
                            <select
                                value={settings.displayMode}
                                onChange={(e) => updateSetting('displayMode', e.target.value)}
                                className="hb-settings-select"
                            >
                                <option value="story">阅读模式</option>
                                <option value="bubble">气泡模式</option>
                                <option value="immersive">沉浸模式</option>
                            </select>
                        </div>

                        {/* 角色人称（AI自称） */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label">角色人称</span>
                            <select
                                value={settings.charPerspective}
                                onChange={(e) => updateSetting('charPerspective', e.target.value)}
                                className="hb-settings-select"
                            >
                                <option value="first">第一人称 (我)</option>
                                <option value="third">第三人称 (人物名字)</option>
                            </select>
                        </div>

                        {/* 用户人称（AI称呼你） */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label">你的人称</span>
                            <select
                                value={settings.userPerspective}
                                onChange={(e) => updateSetting('userPerspective', e.target.value)}
                                className="hb-settings-select"
                            >
                                <option value="second">第二人称 (你)</option>
                                <option value="third">第三人称 (你的名字)</option>
                            </select>
                        </div>

                        {/* 输出字数 */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label">输出字数</span>
                            <input
                                type="number"
                                value={settings.outputLength}
                                onChange={(e) => updateSetting('outputLength', parseInt(e.target.value) || 500)}
                                className="hb-settings-input"
                                min={50}
                                max={1000}
                                step={10}
                                placeholder="300-700"
                            />
                        </div>

                        {/* 记忆深度 (History Limit) */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label">记忆深度</span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                                <input
                                    type="number"
                                    min="5"
                                    max="100"
                                    step="1"
                                    value={settings.historyLimit || 20}
                                    onChange={(e) => updateSetting('historyLimit', parseInt(e.target.value))}
                                    className="hb-settings-input w-24 text-center"
                                    placeholder="默认20"
                                />
                            </div>
                        </div>

                        {/* 打字机效果 */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label">打字机效果</span>
                            <label className="hb-toggle">
                                <input
                                    type="checkbox"
                                    checked={settings.typewriterEffect}
                                    onChange={(e) => updateSetting('typewriterEffect', e.target.checked)}
                                />
                                <span className="hb-toggle-slider"></span>
                            </label>
                        </div>

                        {/* 场景音效 */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label">场景音效</span>
                            <label className="hb-toggle">
                                <input
                                    type="checkbox"
                                    checked={settings.soundEffect}
                                    onChange={(e) => updateSetting('soundEffect', e.target.checked)}
                                />
                                <span className="hb-toggle-slider"></span>
                            </label>
                        </div>

                        {/* 自动续写 */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label">自动续写</span>
                            <label className="hb-toggle">
                                <input
                                    type="checkbox"
                                    checked={settings.autoConversation}
                                    onChange={(e) => updateSetting('autoConversation', e.target.checked)}
                                />
                                <span className="hb-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 4. 个性化颜色 */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">个性化颜色 (点击修改)</div>
                    <div className="bg-white dark:bg-white/5 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5 shadow-sm">
                        {/* 主题色 */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[var(--hb-primary)]"></span>
                                主题色 (名字/重点)
                            </span>
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 relative">
                                <input
                                    type="color"
                                    value={settings.colors?.primary || '#FF6B8A'}
                                    onChange={(e) => updateSetting('colors', { ...settings.colors, primary: e.target.value })}
                                    className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                />
                            </div>
                        </div>

                        {/* 动作色 */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[var(--hb-action)]"></span>
                                动作色 (*...*)
                            </span>
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 relative">
                                <input
                                    type="color"
                                    value={settings.colors?.action || '#FF8C69'}
                                    onChange={(e) => updateSetting('colors', { ...settings.colors, action: e.target.value })}
                                    className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                />
                            </div>
                        </div>

                        {/* 心理色 */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[var(--hb-thought)]"></span>
                                心理色 (内心的想法)
                            </span>
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 relative">
                                <input
                                    type="color"
                                    value={settings.colors?.thought || '#888888'}
                                    onChange={(e) => updateSetting('colors', { ...settings.colors, thought: e.target.value })}
                                    className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                />
                            </div>
                        </div>

                        {/* 正文色 */}
                        <div className="hb-settings-item px-4">
                            <span className="hb-settings-label flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[var(--hb-text)]"></span>
                                正文色 (普通对话)
                            </span>
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 relative">
                                <input
                                    type="color"
                                    value={settings.colors?.text || '#333333'}
                                    onChange={(e) => updateSetting('colors', { ...settings.colors, text: e.target.value })}
                                    className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                />
                            </div>
                        </div>

                        {/* 重置按钮 */}
                        <button
                            className="w-full py-3 text-sm text-center text-gray-400 hover:text-gray-600 active:bg-gray-50 transition-colors"
                            onClick={() => updateSetting('colors', {
                                primary: '#FF6B8A',
                                action: '#FF8C69',
                                thought: '#888888',
                                text: '#333333'
                            })}
                        >
                            恢复默认颜色
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeartbeatSettings;
