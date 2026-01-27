import React from 'react';
import { Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHeartbeat } from '../data/HeartbeatContext';

/**
 * 恋人列表页 - 全屏沉浸式设计
 */
const LoverList = ({ onClose }) => {
    const {
        lovers,
        setCurrentLoverId,
        setCurrentPage,
    } = useHeartbeat();

    // 主恋人（亲密度最高）
    const mainLover = lovers?.length > 0
        ? lovers.reduce((a, b) => (a.intimacy || 0) > (b.intimacy || 0) ? a : b)
        : null;

    // 其他恋人
    const otherLovers = lovers?.filter(l => l.id !== mainLover?.id) || [];

    // 点击恋人
    const handleLoverClick = (lover) => {
        setCurrentLoverId(lover.id);
        setCurrentPage('story');
    };

    // 添加新恋人
    const handleAddLover = () => {
        setCurrentLoverId(null);
        setCurrentPage('editor');
    };

    return (
        <div className="hb-fullscreen-list">


            {/* 恋人卡片网格 */}
            <div className="hb-lovers-grid">
                {/* 主恋人大卡片 */}
                {mainLover && (
                    <motion.div
                        className="hb-main-lover-card"
                        onClick={() => handleLoverClick(mainLover)}
                        whileTap={{ scale: 0.98 }}
                    >
                        {mainLover.avatar ? (
                            <img
                                src={mainLover.avatar}
                                alt={mainLover.name}
                                className="hb-main-lover-bg"
                            />
                        ) : (
                            <div className="hb-main-lover-bg hb-no-avatar">
                                <span className="hb-avatar-initial">{mainLover.name?.[0] || '♡'}</span>
                            </div>
                        )}
                        <div className="hb-main-lover-overlay">
                            <div className="hb-main-lover-name">{mainLover.name}</div>
                            <div className="hb-main-lover-intimacy">
                                <span className="hb-heart">♥</span>
                                <span>{mainLover.intimacy || 30}%</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 其他恋人小卡片 */}
                {otherLovers.map(lover => (
                    <motion.div
                        key={lover.id}
                        className="hb-mini-lover-card"
                        onClick={() => handleLoverClick(lover)}
                        whileTap={{ scale: 0.95 }}
                    >
                        {lover.avatar ? (
                            <img
                                src={lover.avatar}
                                alt={lover.name}
                                className="hb-mini-lover-img"
                            />
                        ) : (
                            <div className="hb-mini-lover-img hb-no-avatar">
                                <span>{lover.name?.[0] || '♡'}</span>
                            </div>
                        )}
                        <div className="hb-mini-lover-name">{lover.name}</div>
                    </motion.div>
                ))}

                {/* 添加按钮（作为卡片） */}
                <motion.div
                    className="hb-add-lover-card"
                    onClick={handleAddLover}
                    whileTap={{ scale: 0.95 }}
                >
                    <Plus size={32} />
                </motion.div>
            </div>
        </div>
    );
};

export default LoverList;
