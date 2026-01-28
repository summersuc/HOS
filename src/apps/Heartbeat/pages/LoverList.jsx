import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Heart, Trash2, AlertTriangle, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHeartbeat } from '../data/HeartbeatContext';
import { storageService } from '../../../services/StorageService';
import { triggerHaptic } from '../../../utils/haptics';

/**
 * 心动App主页面 - 美化版
 */
const LoverList = (props) => {
    const hbContext = useHeartbeat() || {};
    const {
        lovers: contextLovers,
        setCurrentLoverId: contextSetLoverId,
        setCurrentPage: contextSetPage,
        deleteLover: contextDeleteLover,
        clearAllLovers: contextClearAll,
    } = hbContext;

    // 优先使用 props 传入的值
    const lovers = props.lovers || contextLovers;
    const setCurrentLoverId = props.setCurrentLoverId || contextSetLoverId;
    const setCurrentPage = props.setCurrentPage || contextSetPage;
    const deleteLover = props.deleteLover || contextDeleteLover;
    const clearAllLovers = props.clearAllLovers || contextClearAll;

    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // 获取头像URL
    const getAvatarUrl = (avatar) => {
        if (!avatar) return null;
        if (typeof avatar === 'string' && avatar.startsWith('idb:')) {
            return storageService.getCachedBlobUrl(avatar) || avatar;
        }
        return avatar;
    };

    // 分离虚拟角色和心动记录
    const virtualCharacters = lovers?.filter(l => l.isVirtual) || [];
    const heartbeatRecords = lovers?.filter(l => !l.isVirtual) || [];

    // 点击角色头像
    const handleCharacterClick = (character) => {
        triggerHaptic();
        setCurrentLoverId(character.id);
        setCurrentPage('profile');
    };

    // 点击心动记录
    const handleHeartbeatClick = (record) => {
        triggerHaptic();
        setCurrentLoverId(record.id);
        setCurrentPage('story');
    };

    // 确认删除
    const handleDelete = async () => {
        if (deleteTarget) {
            await deleteLover(deleteTarget.id);
            setDeleteTarget(null);
        }
    };

    // 清空全部
    const handleClearAll = async () => {
        await clearAllLovers();
        setShowClearConfirm(false);
    };

    return (
        <div className="min-h-full" style={{ background: '#DFE5EA', paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="p-4 space-y-6">

                {/* ========== 心动选手区域 ========== */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Sparkles size={16} className="text-pink-400" />
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">心动选手</span>
                    </div>

                    {/* 横向滑动头像列表 */}
                    <div className="flex gap-4 overflow-x-auto pb-2 px-1 -mx-1 scrollbar-hide">
                        {virtualCharacters.length > 0 ? (
                            virtualCharacters.map(char => (
                                <motion.div
                                    key={char.id}
                                    className="flex flex-col items-center gap-2 min-w-[72px]"
                                    onClick={() => handleCharacterClick(char)}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="w-16 h-16 rounded-2xl p-[2px] shadow-lg" style={{ background: 'linear-gradient(135deg, #B29E8F, #C7D2D7)' }}>
                                        <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#2C2C2E] overflow-hidden flex items-center justify-center">
                                            {getAvatarUrl(char.avatar) ? (
                                                <img
                                                    src={getAvatarUrl(char.avatar)}
                                                    alt={char.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-2xl text-pink-300">{char.name?.[0] || '♡'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate max-w-[72px]">
                                        {char.name}
                                    </span>
                                </motion.div>
                            ))
                        ) : (
                            <div className="w-full text-center py-6 text-sm text-gray-400">
                                先在聊天App创建角色哦~
                            </div>
                        )}
                    </div>
                </div>

                {/* ========== 心动记录区域 ========== */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Heart size={16} className="text-pink-500" fill="#FF6B8A" />
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">心动记录</span>
                        </div>
                        {heartbeatRecords.length > 0 && (
                            <button
                                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${isEditing
                                    ? 'bg-pink-100 text-pink-500 dark:bg-pink-900/20'
                                    : 'bg-gray-100 text-gray-500 dark:bg-white/10'
                                    }`}
                                onClick={() => { triggerHaptic(); setIsEditing(!isEditing); }}
                            >
                                {isEditing ? '完成' : '管理'}
                            </button>
                        )}
                    </div>

                    {/* 心动记录列表 */}
                    <div className="space-y-3">
                        {heartbeatRecords.length > 0 ? (
                            heartbeatRecords.map((record, index) => (
                                <HeartbeatRecordCard
                                    key={record.id}
                                    record={record}
                                    avatarUrl={getAvatarUrl(record.avatar)}
                                    isEditing={isEditing}
                                    index={index}
                                    onClick={() => handleHeartbeatClick(record)}
                                    onDelete={() => setDeleteTarget(record)}
                                />
                            ))
                        ) : (
                            <motion.div
                                className="flex flex-col items-center justify-center py-16"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 flex items-center justify-center mb-4">
                                    <Heart size={36} className="text-pink-300" />
                                </div>
                                <p className="text-gray-500 font-medium mb-1">还没有心动记录</p>
                                <p className="text-gray-400 text-sm">点击上方头像开始心动之旅~</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* ========== 删除确认弹窗 ========== */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div
                        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(null); }}
                        />
                        <motion.div
                            className="bg-white dark:bg-[#2C2C2E] rounded-3xl w-full max-w-[300px] overflow-hidden shadow-2xl relative z-10"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 text-center">
                                <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
                                    <Trash2 size={26} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    删除该心动记录？
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                    聊天记录将被清空，角色本身不会删除
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold active:scale-95 transition-transform"
                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(null); }}
                                    >
                                        取消
                                    </button>
                                    <button
                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold active:scale-95 transition-transform"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ========== 清空全部确认弹窗 ========== */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
                        <motion.div
                            className="bg-white dark:bg-[#2C2C2E] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                        >
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    清空所有心动记录？
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    所有聊天数据将被删除<br />角色本身不会被删除
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold active:scale-95 transition-transform"
                                        onClick={() => setShowClearConfirm(false)}
                                    >
                                        取消
                                    </button>
                                    <button
                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold active:scale-95 transition-transform"
                                        onClick={handleClearAll}
                                    >
                                        确认清空
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * 心动记录卡片 - 美化版
 */
const HeartbeatRecordCard = ({ record, avatarUrl, isEditing, index, onClick, onDelete }) => {
    const timerRef = React.useRef(null);
    const isLongPressRef = React.useRef(false);

    const handleTouchStart = () => {
        if (isEditing) return;
        isLongPressRef.current = false;
        timerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            triggerHaptic();
            onDelete();
        }, 600);
    };

    const handleTouchEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleClick = () => {
        if (isEditing) return;
        if (!isLongPressRef.current) {
            onClick();
        }
        isLongPressRef.current = false;
    };

    return (
        <motion.div
            className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-white/30 dark:border-white/5"
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileTap={isEditing ? { scale: 1 } : { scale: 0.98 }}
        >
            {/* 头像 */}
            <div className="w-14 h-14 rounded-2xl p-[2px] shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, #B29E8F, #C7D2D7)' }}>
                <div className="w-full h-full rounded-[12px] bg-white dark:bg-[#2C2C2E] overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={record.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xl text-pink-300">{record.name?.[0] || '♡'}</span>
                    )}
                </div>
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">{record.name}</div>
                <div className="text-sm text-gray-400 truncate flex items-center gap-1 mt-0.5">
                    <Heart size={12} className="text-pink-400" fill="#FF6B8A" />
                    <span>心动中...</span>
                </div>
            </div>

            {/* 箭头/删除按钮 */}
            <AnimatePresence mode="wait">
                {isEditing ? (
                    <motion.div
                        key="delete"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-red-500 flex items-center justify-center cursor-pointer"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    >
                        <Trash2 size={18} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="arrow"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-gray-300"
                    >
                        <ChevronRight size={20} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default LoverList;
