import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHeartbeat } from '../data/HeartbeatContext';
import { storageService } from '../../../services/StorageService';

/**
 * 角色人设预览页面
 * 
 * 功能：
 * - 显示角色头像、名字、人设描述
 * - "开始心动"按钮 → 创建心动记录并进入聊天
 */
const CharacterProfile = (props) => {
    // 优先从 props 获取，如果没传（比如直接路由跳转）则从 Context 获取
    const hbContext = useHeartbeat() || {};

    const {
        currentLover: contextLover,
        setCurrentPage: contextSetPage,
        setCurrentLoverId: contextSetLoverId,
        importFromMessenger: contextImport,
    } = hbContext;

    // 优先使用 props 传入的值，作为 Context 丢失时的兜底
    const currentLover = props.currentLover || contextLover;
    const setCurrentPage = props.setCurrentPage || contextSetPage;
    const setCurrentLoverId = props.setCurrentLoverId || contextSetLoverId;
    const importFromMessenger = props.importFromMessenger || contextImport;

    // 获取头像URL
    const getAvatarUrl = (avatar) => {
        if (!avatar) return null;
        if (typeof avatar === 'string' && avatar.startsWith('idb:')) {
            return storageService.getCachedBlobUrl(avatar) || avatar;
        }
        return avatar;
    };

    // 开始心动 → 创建记录并进入聊天
    const handleStartHeartbeat = async () => {
        if (!currentLover) return;

        // 如果是虚拟角色，需要先导入创建真实记录
        if (currentLover.isVirtual && currentLover.sourceCharacterId) {
            const realLoverId = await importFromMessenger(currentLover.sourceCharacterId);
            if (realLoverId) {
                setCurrentLoverId(realLoverId);
                setCurrentPage('story');
            }
        } else {
            // 已经是真实记录，直接进入
            setCurrentPage('story');
        }
    };

    if (!currentLover) {
        return (
            <div className="hb-profile-page">
                <div className="hb-profile-empty">
                    <p>角色信息加载中...</p>
                </div>
            </div>
        );
    }

    const avatarUrl = getAvatarUrl(currentLover.avatar);

    return (
        <div className="hb-profile-page">
            {/* 顶部头像区域 */}
            <div className="hb-profile-header">
                <div className="hb-profile-avatar-wrap">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={currentLover.name}
                            className="hb-profile-avatar"
                        />
                    ) : (
                        <div className="hb-profile-avatar hb-profile-avatar-placeholder">
                            <span>{currentLover.name?.[0] || '♡'}</span>
                        </div>
                    )}
                </div>
                <h1 className="hb-profile-name">{currentLover.name}</h1>
                <p className="hb-profile-relationship">{currentLover.relationship || '恋人'}</p>
            </div>

            {/* 人设信息 */}
            <div className="hb-profile-content">
                {currentLover.description && (
                    <div className="hb-profile-section">
                        <h3 className="hb-profile-section-title">📖 人设简介</h3>
                        <p className="hb-profile-section-text">{currentLover.description}</p>
                    </div>
                )}

                {currentLover.personality && (
                    <div className="hb-profile-section">
                        <h3 className="hb-profile-section-title">✨ 性格特点</h3>
                        <p className="hb-profile-section-text">{currentLover.personality}</p>
                    </div>
                )}

                {currentLover.firstMessage && (
                    <div className="hb-profile-section">
                        <h3 className="hb-profile-section-title">💬 开场白</h3>
                        <p className="hb-profile-section-text hb-profile-quote">
                            "{currentLover.firstMessage}"
                        </p>
                    </div>
                )}
            </div>

            {/* 底部按钮 */}
            <div className="hb-profile-actions">
                <motion.button
                    className="hb-profile-btn hb-profile-btn-primary"
                    onClick={handleStartHeartbeat}
                    whileTap={{ scale: 0.95 }}
                >
                    <Heart size={20} />
                    <span>心动</span>
                </motion.button>
            </div>
        </div>
    );
};

export default CharacterProfile;
