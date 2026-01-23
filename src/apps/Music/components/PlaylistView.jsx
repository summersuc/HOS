import React, { useState, useEffect, memo } from 'react';
import { MusicService } from '../../../services/MusicService';
import { motion } from 'framer-motion';
import { Plus, Heart, ListMusic, ChevronRight, MoreVertical, Play, LogOut, Disc } from 'lucide-react';

const PlaylistView = memo(({ userId, onSelectPlaylist }) => {
    const [playlists, setPlaylists] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [creating, setCreating] = useState(false);

    const handleLogout = async () => {
        await MusicService.logout();
        window.location.reload();
    };

    const loadPlaylists = () => {
        if (userId) {
            MusicService.getUserPlaylist(userId).then(res => {
                if (res?.playlist) {
                    setPlaylists(res.playlist);
                }
            });
        }
    };

    useEffect(() => {
        loadPlaylists();
    }, [userId]);

    const handleCreate = async () => {
        if (!newPlaylistName.trim()) return;
        setCreating(true);
        try {
            await MusicService.createPlaylist(newPlaylistName);
            setShowCreateModal(false);
            setNewPlaylistName('');
            loadPlaylists(); // Refresh
        } catch (e) {
            console.error("Create failed", e);
            alert("创建失败，请重试");
        }
        setCreating(false);
    };

    // Separate playlists
    const myFavorite = playlists.find(p => p.specialType === 5) || playlists[0];
    const created = playlists.filter(p => p.userId === userId && p.id !== myFavorite?.id);
    const subscribed = playlists.filter(p => p.userId !== userId);

    return (
        <div className="flex flex-col pb-32 px-4 bg-[#F2F4F6] dark:bg-black min-h-full">
            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 w-full max-w-xs shadow-xl"
                    >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">新建歌单</h3>
                        <input
                            autoFocus
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="输入歌单标题"
                            className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-3 text-sm outline-none mb-6 dark:text-white"
                        />
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-2.5 rounded-full font-bold text-sm bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newPlaylistName.trim() || creating}
                                className="flex-1 py-2.5 rounded-full font-bold text-sm bg-red-500 text-white disabled:opacity-50"
                            >
                                {creating ? '创建中...' : '完成'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* --- Quick Actions (Logout) --- */}
            <div className="flex justify-between items-center mb-6 pt-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">我的音乐</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 dark:bg-white/10 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 active:scale-95 transition"
                    >
                        <LogOut size={14} />
                        <span>退出登录</span>
                    </button>
                </div>
            </div>

            {/* --- My Favorite Card (Wide) --- */}
            {myFavorite && (
                <div
                    onClick={() => onSelectPlaylist(myFavorite.id, myFavorite)}
                    className="mb-8 relative overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 dark:from-red-600 dark:to-pink-800 rounded-[24px] p-5 flex items-center cursor-pointer active:scale-95 transition-transform shadow-xl shadow-red-500/20"
                >
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white mr-4 shadow-inner border border-white/20">
                        <Heart fill="currentColor" size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <h3 className="text-lg font-bold text-white">我喜欢的音乐</h3>
                        <p className="text-xs text-white/80 font-medium mt-0.5">{myFavorite.trackCount} 首歌曲</p>
                    </div>
                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/20">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                    </div>
                </div>
            )}

            {/* --- Created Playlists (Grid) --- */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">创建的歌单</span>
                        <span className="text-[10px] bg-gray-200 dark:bg-white/10 text-gray-500 px-1.5 rounded-full">{created.length}</span>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="p-1 bg-gray-200 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300 active:bg-gray-300"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {created.map(pl => <PlaylistItem key={pl.id} pl={pl} onClick={() => onSelectPlaylist(pl.id, pl)} />)}
                </div>
            </div>

            {/* --- Subscribed Playlists (Grid) --- */}
            {subscribed.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center space-x-1">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">收藏的歌单</span>
                            <span className="text-[10px] bg-gray-200 dark:bg-white/10 text-gray-500 px-1.5 rounded-full">{subscribed.length}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {subscribed.map(pl => <PlaylistItem key={pl.id} pl={pl} onClick={() => onSelectPlaylist(pl.id, pl)} />)}
                    </div>
                </div>
            )}
        </div>
    );
});

// --- Memoized Row Component (Outside Main) ---
const PlaylistItem = memo(({ pl, onClick }) => (
    <motion.div
        layout
        onClick={onClick}
        className="flex flex-col p-2 rounded-2xl bg-white dark:bg-[#1C1C1E] active:scale-[0.98] transition cursor-pointer shadow-sm border border-gray-100 dark:border-white/5"
    >
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-200 mb-2">
            <img src={pl.coverImgUrl} className="w-full h-full object-cover" loading="lazy" alt={pl.name} />
            <div className="absolute top-1 right-1 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center">
                <MusicService.PlayIcon className="text-white w-2.5 h-2.5 mr-0.5" />
                {/* Note: PlayIcon implies we have Icon, if not assume none or generic */}
                <span className="text-[9px] text-white font-medium">{pl.trackCount}</span>
            </div>
        </div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{pl.name}</h4>
    </motion.div>
));

// Mock PlayIcon if unused
if (!MusicService.PlayIcon) MusicService.PlayIcon = ({ className }) => <Play className={className} size={10} />;

export default PlaylistView;
