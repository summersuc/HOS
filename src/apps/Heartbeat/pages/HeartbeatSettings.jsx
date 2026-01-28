import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHeartbeat } from '../data/HeartbeatContext';
import { db } from '../../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { storageService } from '../../../services/StorageService';
import { triggerHaptic } from '../../../utils/haptics';
import {
    Edit, UserCheck, Check, User, ChevronDown,
    Heart, Palette, Settings, Sparkles, Type, History, Zap
} from 'lucide-react';

// --- 折叠式 Section 组件 (参考 Messenger ChatSettingsPage) ---
const Section = ({ id, label, icon: Icon, expandedSection, toggleSection, children }) => {
    const isOpen = expandedSection === id;
    return (
        <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 transition-all">
            <button
                onClick={() => toggleSection(id)}
                className="w-full flex items-center gap-4 p-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #B29E8F, #C7D2D7)' }}>
                    <Icon size={18} className="text-white" strokeWidth={2} />
                </div>
                <span className="flex-1 text-left font-semibold text-[15px] text-gray-900 dark:text-white">{label}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}>
                    <ChevronDown size={18} className="text-gray-300" />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- 精美开关组件 ---
const Switch = ({ checked, onChange, color = 'pink' }) => {
    const colors = {
        pink: 'bg-pink-500',
        purple: 'bg-purple-500',
        blue: 'bg-blue-500'
    };
    return (
        <button
            onClick={() => { triggerHaptic(); onChange(!checked); }}
            className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${checked ? colors[color] : 'bg-gray-300 dark:bg-gray-600'}`}
        >
            <motion.div
                className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
                animate={{ x: checked ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        </button>
    );
};

// --- 按钮组组件 ---
const ButtonGroup = ({ options, value, onChange }) => (
    <div className="grid grid-cols-3 gap-2">
        {options.map(opt => (
            <button
                key={opt.id}
                onClick={() => { triggerHaptic(); onChange(opt.id); }}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${value === opt.id
                    ? 'bg-[#B29E8F] text-white shadow-md'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

/**
 * 心动设置页（优化后）
 */
const HeartbeatSettings = (props) => {
    const hbContext = useHeartbeat() || {};
    const {
        settings: contextSettings,
        setSettings: contextSetSettings,
        currentLover: contextLover,
        currentLoverId: contextLoverId,
        updateLover: contextUpdateLover,
        setCurrentPage: contextSetPage,
    } = hbContext;

    // 优先使用 props 传入的值
    const settings = props.settings || contextSettings || {};
    const setSettings = props.setSettings || contextSetSettings;
    const currentLover = props.currentLover || contextLover;
    const currentLoverId = props.currentLoverId || contextLoverId;
    const updateLover = props.updateLover || contextUpdateLover;
    const setCurrentPage = props.setCurrentPage || contextSetPage;

    const allPersonas = useLiveQuery(() => db.userPersonas.toArray()) || [];
    const [expandedSection, setExpandedSection] = useState('display');

    const toggleSection = (id) => {
        triggerHaptic();
        setExpandedSection(prev => prev === id ? null : id);
    };

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // 处理用户人设选择
    const handleSelectPersona = async (persona) => {
        if (!currentLoverId) return;
        triggerHaptic();
        await updateLover(currentLoverId, {
            userPersonaId: persona.id,
            userNickname: persona.userName || persona.name
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

    // --- 渲染各 Section 内容 ---

    // 显示与模式
    const renderDisplaySection = () => (
        <div className="space-y-4">
            {/* 显示模式 */}
            <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500">显示模式</span>
                <ButtonGroup
                    options={[
                        { id: 'story', label: '阅读' },
                        { id: 'bubble', label: '气泡' },
                        { id: 'immersive', label: '沉浸' },
                    ]}
                    value={settings.displayMode}
                    onChange={(v) => updateSetting('displayMode', v)}
                />
            </div>

            {/* 角色人称 */}
            <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500">角色人称 (AI自称)</span>
                <ButtonGroup
                    options={[
                        { id: 'first', label: '我' },
                        { id: 'third', label: '人物名字' },
                    ]}
                    value={settings.charPerspective}
                    onChange={(v) => updateSetting('charPerspective', v)}
                />
            </div>

            {/* 用户人称 */}
            <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500">你的人称 (AI称呼你)</span>
                <ButtonGroup
                    options={[
                        { id: 'second', label: '你' },
                        { id: 'third', label: '你的名字' },
                    ]}
                    value={settings.userPerspective}
                    onChange={(v) => updateSetting('userPerspective', v)}
                />
            </div>
        </div>
    );

    // 输出控制
    const renderOutputSection = () => (
        <div className="space-y-4">
            {/* 输出字数 */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">输出字数</span>
                    <span className="text-sm font-bold text-pink-500">{settings.outputLength || 300}</span>
                </div>
                <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={settings.outputLength || 300}
                    onChange={(e) => updateSetting('outputLength', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                    <span>50 (简短)</span>
                    <span>1000 (详细)</span>
                </div>
            </div>

            {/* 记忆深度 */}
            <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">记忆深度</span>
                    <span className="text-sm font-bold text-purple-500">{settings.historyLimit || 20}条</span>
                </div>
                <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={settings.historyLimit || 20}
                    onChange={(e) => updateSetting('historyLimit', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                    <span>5 (节省)</span>
                    <span>100 (深度)</span>
                </div>
            </div>
        </div>
    );

    // 效果开关
    const renderEffectsSection = () => (
        <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">打字机效果</span>
                    <span className="text-[10px] text-gray-400">逐字显示 AI 回复</span>
                </div>
                <Switch checked={settings.typewriterEffect} onChange={(v) => updateSetting('typewriterEffect', v)} />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-white/5">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">场景音效</span>
                    <span className="text-[10px] text-gray-400">播放环境背景音</span>
                </div>
                <Switch checked={settings.soundEffect} onChange={(v) => updateSetting('soundEffect', v)} color="purple" />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-white/5">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">自动续写</span>
                    <span className="text-[10px] text-gray-400">AI 自动推进剧情</span>
                </div>
                <Switch checked={settings.autoConversation} onChange={(v) => updateSetting('autoConversation', v)} color="blue" />
            </div>
        </div>
    );

    // 个性化颜色
    const renderColorsSection = () => (
        <div className="space-y-3">
            {[
                { key: 'primary', label: '主题色', desc: '名字/重点', default: '#FF6B8A' },
                { key: 'action', label: '动作色', desc: '*动作描写*', default: '#FF8C69' },
                { key: 'thought', label: '心理色', desc: '内心想法', default: '#888888' },
                { key: 'text', label: '正文色', desc: '普通对话', default: '#333333' },
            ].map((item, idx) => (
                <div key={item.key} className={`flex items-center justify-between py-2 ${idx > 0 ? 'border-t border-gray-100 dark:border-white/5' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: settings.colors?.[item.key] || item.default }} />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
                            <span className="text-[10px] text-gray-400">{item.desc}</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-white/10 relative">
                        <input
                            type="color"
                            value={settings.colors?.[item.key] || item.default}
                            onChange={(e) => { triggerHaptic(); updateSetting('colors', { ...settings.colors, [item.key]: e.target.value }); }}
                            className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer p-0 border-0"
                        />
                    </div>
                </div>
            ))}
            <button
                className="w-full py-2.5 text-sm text-center text-gray-400 hover:text-pink-500 active:bg-gray-50 dark:active:bg-white/5 rounded-xl transition-colors"
                onClick={() => {
                    triggerHaptic();
                    updateSetting('colors', { primary: '#FF6B8A', action: '#FF8C69', thought: '#888888', text: '#333333' });
                }}
            >
                恢复默认颜色
            </button>
        </div>
    );

    return (
        <div className="min-h-full" style={{ background: '#DFE5EA', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
            <div className="p-4 space-y-4">

                {/* 当前角色卡片 */}
                {currentLover && (
                    <motion.div
                        className="bg-white/80 dark:bg-white/5 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-4 cursor-pointer shadow-lg border border-white/20"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrentPage('editor')}
                    >
                        <img
                            src={getAvatarUrl(currentLover.avatar)}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-pink-200 dark:border-pink-800"
                            onError={(e) => e.target.style.display = 'none'}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 dark:text-white truncate">{currentLover.name}</div>
                            <div className="text-xs text-gray-500 truncate">{currentLover.description || '暂无简介...'}</div>
                        </div>
                        <div className="flex items-center text-pink-500 text-xs font-semibold bg-pink-50 dark:bg-pink-900/20 px-3 py-1.5 rounded-full">
                            <Edit size={14} className="mr-1" />
                            编辑
                        </div>
                    </motion.div>
                )}

                {/* 亲密度调节 */}
                {currentLover && (
                    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-white/20">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Heart size={18} className="text-pink-500" fill="#FF6B8A" />
                                <span className="font-semibold text-gray-900 dark:text-white">亲密度</span>
                            </div>
                            <span className="text-lg font-bold text-pink-500">{currentLover.intimacy || 0}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={currentLover.intimacy || 0}
                            onChange={(e) => { triggerHaptic(); updateLover(currentLoverId, { intimacy: parseInt(e.target.value) }); }}
                            className="w-full h-2 bg-gradient-to-r from-gray-200 to-pink-200 dark:from-gray-700 dark:to-pink-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>💔 陌路</span>
                            <span>初识</span>
                            <span>熟悉</span>
                            <span>亲密</span>
                            <span>💕 热恋</span>
                        </div>
                    </div>
                )}

                {/* 用户人设选择 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <UserCheck size={14} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">我的设定</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {allPersonas.map(p => {
                            const isSelected = currentLover?.userPersonaId === p.id;
                            const displayName = p.userName || p.name || '未命名';
                            const avatarSrc = getAvatarUrl(p.avatar);

                            return (
                                <motion.button
                                    key={p.id}
                                    onClick={() => handleSelectPersona(p)}
                                    whileTap={{ scale: 0.97 }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                        ? 'bg-pink-50 border-pink-200 ring-2 ring-pink-500/20 dark:bg-pink-900/20 dark:border-pink-500/30'
                                        : 'bg-white border-transparent hover:bg-gray-50 dark:bg-white/5 dark:hover:bg-white/10'}`}
                                >
                                    <div className="relative">
                                        <img src={avatarSrc} className="w-10 h-10 rounded-full object-cover bg-gray-100" />
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
                                </motion.button>
                            );
                        })}
                        <button
                            className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-gray-300 dark:border-white/10 text-gray-400 gap-2 hover:bg-gray-50 dark:hover:bg-white/5"
                            onClick={() => { triggerHaptic(); }}
                        >
                            <User size={20} />
                            <span className="text-xs">添加形象</span>
                        </button>
                    </div>
                </div>

                {/* 折叠式设置区 */}
                <div className="space-y-3">
                    <Section id="display" label="显示与模式" icon={Palette} expandedSection={expandedSection} toggleSection={toggleSection}>
                        {renderDisplaySection()}
                    </Section>

                    <Section id="output" label="输出控制" icon={Type} expandedSection={expandedSection} toggleSection={toggleSection}>
                        {renderOutputSection()}
                    </Section>

                    <Section id="effects" label="效果开关" icon={Sparkles} expandedSection={expandedSection} toggleSection={toggleSection}>
                        {renderEffectsSection()}
                    </Section>

                    <Section id="colors" label="个性化颜色" icon={Palette} expandedSection={expandedSection} toggleSection={toggleSection}>
                        {renderColorsSection()}
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default HeartbeatSettings;
