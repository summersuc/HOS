import React, { useState, useEffect } from 'react';
import { MusicService } from '../../../services/MusicService';
import { motion } from 'framer-motion';
import { Plus, Heart, ListMusic, ChevronRight, MoreVertical, Play, LogOut, Disc } from 'lucide-react';

const PlaylistView = ({ userId, onSelectPlaylist }) => {
    const [playlists, setPlaylists] = useState([]);

    const handleLogout = async () => {
        await MusicService.logout();
        window.location.reload(); // Simple reload to clear state/re-check login
    };

    useEffect(() => {
        if (userId) {
            MusicService.getUserPlaylist(userId).then(res => {
                if (res?.playlist) {
                    setPlaylists(res.playlist);
                }
            });
        }
    }, [userId]);

    // Separate playlists
    const myFavorite = playlists.find(p => p.specialType === 5) || playlists[0];
    const created = playlists.filter(p => p.userId === userId && p.id !== myFavorite?.id);
    const subscribed = playlists.filter(p => p.userId !== userId);

    const PlaylistRow = ({ pl }) => (
        <motion.div
            layout
            onClick={() => onSelectPlaylist(pl.id)}
            className="flex items-center p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] active:scale-[0.98] transition cursor-pointer shadow-sm border border-gray-100 dark:border-white/5 mb-2"
        >
            <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                <img src={pl.coverImgUrl} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="flex-1 ml-3 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{pl.name}</h4>
                <p className="text-xs text-gray-500 truncate mt-0.5">{pl.trackCount} tracks · {pl.creator?.nickname}</p>
            </div>
            <button className="p-2 text-gray-300 dark:text-gray-600">
                <ChevronRight size={16} />
            </button>
        </motion.div>
    );

    return (
        <div className="flex flex-col pb-32 px-4 bg-[#F2F4F6] dark:bg-black min-h-full">
            {/* --- Quick Actions (Logout) --- */}
            <div className="flex justify-between items-center mb-6 pt-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Music</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 dark:bg-white/10 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 active:scale-95 transition"
                    >
                        <LogOut size={14} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* --- My Favorite Card --- */}
            {myFavorite && (
                <div
                    onClick={() => onSelectPlaylist(myFavorite.id)}
                    className="mb-8 relative overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 dark:from-red-600 dark:to-pink-800 rounded-[24px] p-5 flex items-center cursor-pointer active:scale-95 transition-transform shadow-xl shadow-red-500/20"
                >
                    {/* Background Decor */}
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white mr-4 shadow-inner border border-white/20">
                        <Heart fill="currentColor" size={24} />
                    </div>
                    <div className="flex-1 relative z-10">
                        <h3 className="text-lg font-bold text-white">My Favorites</h3>
                        <p className="text-xs text-white/80 font-medium mt-0.5">{myFavorite.trackCount} songs</p>
                    </div>
                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/20">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                    </div>
                </div>
            )}

            {/* --- Created Playlists --- */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created Playlists</span>
                        <span className="text-[10px] bg-gray-200 dark:bg-white/10 text-gray-500 px-1.5 rounded-full">{created.length}</span>
                    </div>
                    <button className="p-1 bg-gray-200 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300">
                        <Plus size={14} />
                    </button>
                </div>
                <div className="flex flex-col">
                    {created.map(pl => <PlaylistRow key={pl.id} pl={pl} />)}
                </div>
            </div>

            {/* --- Subscribed Playlists --- */}
            {subscribed.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center space-x-1">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collected Playlists</span>
                            <span className="text-[10px] bg-gray-200 dark:bg-white/10 text-gray-500 px-1.5 rounded-full">{subscribed.length}</span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        {subscribed.map(pl => <PlaylistRow key={pl.id} pl={pl} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaylistView;
