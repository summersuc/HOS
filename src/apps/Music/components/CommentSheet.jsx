import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MusicService } from '../../../services/MusicService';
import { Heart, X, ThumbsUp } from 'lucide-react';

const CommentSheet = ({ songId, onClose }) => {
    const [comments, setComments] = useState([]);
    const [hotComments, setHotComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        loadComments();
    }, [songId]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const res = await MusicService.getSongComments(songId);
            if (res) {
                setComments(res.comments || []);
                setHotComments(res.hotComments || []);
                setTotal(res.total || 0);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleLike = async (cid, liked, type = 0) => {
        // Optimistic update
        const toggleLike = (list) => list.map(c => {
            if (c.commentId === cid) {
                return { ...c, liked: !liked, likedCount: liked ? c.likedCount - 1 : c.likedCount + 1 };
            }
            return c;
        });

        setComments(toggleLike(comments));
        setHotComments(toggleLike(hotComments));

        try {
            await MusicService.likeComment(songId, cid, liked ? 0 : 1, type);
        } catch (e) {
            // Revert
            setComments(toggleLike(comments));
            setHotComments(toggleLike(hotComments));
        }
    };



    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-[20%] z-50 bg-white dark:bg-[#1C1C1E] rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(e, info) => { if (info.offset.y > 100) onClose(); }}
        >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-sm sticky top-0 z-10">
                <div className="font-bold text-gray-900 dark:text-white">
                    评论 <span className="text-xs text-gray-500">({total})</span>
                </div>
                <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full">
                    <X size={16} className="text-gray-500 dark:text-gray-300" />
                </button>
            </div>

            {/* List */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-6 overscroll-contain"
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag closing when scrolling
            >
                {loading && (
                    <div className="flex justify-center py-10">
                        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {!loading && hotComments.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3">精彩评论</h3>
                        {hotComments.map(c => <CommentItem key={c.commentId} c={c} onLike={handleLike} />)}
                    </div>
                )}

                {!loading && comments.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3">最新评论</h3>
                        {comments.map(c => <CommentItem key={c.commentId} c={c} onLike={handleLike} />)}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const CommentItem = ({ c, onLike }) => (
    <div className="flex items-start space-x-3 mb-4">
        <img src={c.user.avatarUrl} className="w-8 h-8 rounded-full" loading="lazy" />
        <div className="flex-1 min-w-0 border-b border-gray-100 dark:border-white/5 pb-3">
            <div className="flex justify-between items-start">
                <div>
                    <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        {c.user.nickname}
                    </div>
                    <div className="text-[10px] text-gray-400">
                        {new Date(c.time).toLocaleDateString()}
                    </div>
                </div>
                <div
                    onClick={() => onLike(c.commentId, c.liked)}
                    className={`flex items-center space-x-1 cursor-pointer ${c.liked ? 'text-red-500' : 'text-gray-400'}`}
                >
                    <span className="text-[10px]">{c.likedCount}</span>
                    <ThumbsUp size={12} fill={c.liked ? "currentColor" : "none"} />
                </div>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 leading-relaxed">
                {c.content}
            </p>
            {c.beReplied && c.beReplied.length > 0 && (
                <div className="mt-2 text-xs bg-gray-100 dark:bg-white/5 p-2 rounded text-gray-500">
                    <span className="font-bold">@{c.beReplied[0].user.nickname}: </span>
                    {c.beReplied[0].content}
                </div>
            )}
        </div>
    </div>
);

export default CommentSheet;
