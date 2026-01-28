import React, { useState, useEffect } from 'react';
import { MusicService } from '../../../services/MusicService';
import { motion } from 'framer-motion';
import { Play, Search, Heart, Check, Plus, Share2 } from 'lucide-react';
import { useToast } from '../../../components/common/Toast';

const SongListView = ({ playlistId, initialData, onBack, onPlaySong, onOpenSearch }) => {
    const [songs, setSongs] = useState([]);
    const [info, setInfo] = useState(initialData ? {
        ...initialData,
        coverImgUrl: initialData.coverImgUrl || initialData.picUrl || initialData.cover,
        description: initialData.description || '加载中...'
    } : null);
    const [subscribed, setSubscribed] = useState(false);
    const { showToast } = useToast();
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        // Fetch Playlist Header Info & Songs
        MusicService.getPlaylistDetail(playlistId).then(res => {
            if (res?.playlist) {
                setInfo(res.playlist);
                setSubscribed(res.playlist.subscribed);
                if (res.playlist.tracks) setSongs(res.playlist.tracks);
            } else if (res?.songs) {
                setSongs(res.songs); // Fallback
                setInfo(prev => ({
                    ...prev,
                    // Keep existing info if available, else derive
                    name: prev?.name || "歌曲列表",
                    coverImgUrl: prev?.coverImgUrl || res.songs[0]?.al?.picUrl
                }));
            }
        });
    }, [playlistId]);

    const handlePlayAll = () => {
        if (songs.length > 0) {
            onPlaySong(songs[0], songs);
        }
    };

    const handleSubscribe = async () => {
        if (!info) return;
        const newStatus = !subscribed;
        try {
            // Optimistic Update
            setSubscribed(newStatus);
            const t = newStatus ? 1 : 2;
            const res = await MusicService.subscribePlaylist(playlistId, t);
            if (res.code === 200) {
                showToast(newStatus ? "收藏成功" : "已取消收藏", "success");
            } else {
                setSubscribed(!newStatus); // Revert
                showToast("操作失败", "error");
            }
        } catch (e) {
            setSubscribed(!newStatus);
            showToast("网络错误", "error");
        }
    };

    // --- Skeleton Loading ---
    if (!info) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-[#121212]">
                <div className="h-[280px] bg-gray-100 dark:bg-zinc-900 animate-pulse flex items-end p-6">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-white/10 rounded-xl mr-4" />
                    <div className="flex-1 space-y-2 mb-2">
                        <div className="h-6 w-2/3 bg-gray-200 dark:bg-white/10 rounded" />
                        <div className="h-4 w-1/3 bg-gray-200 dark:bg-white/10 rounded" />
                    </div>
                </div>
                <div className="flex-1 p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-12 bg-gray-50 dark:bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#F5F5F7] dark:bg-black relative overflow-hidden font-sans">
            {/* --- Sticky Header (Fixed Overlay) --- */}
            <div
                className={`absolute top-0 left-0 right-0 z-40 px-4 py-3 min-h-[64px] pb-safe-top pt-[calc(env(safe-area-inset-top)+10px)] flex items-center justify-between transition-all duration-300 ${scrollY > 200
                    ? 'bg-[#F5F5F7]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl shadow-sm border-b border-black/5 dark:border-white/5'
                    : 'bg-transparent'
                    }`}
            >
                <div
                    onClick={onBack}
                    className={`w-10 h-10 flex items-center justify-center rounded-full active:bg-black/10 dark:active:bg-white/10 transition-colors cursor-pointer ${scrollY > 200 ? 'text-gray-900 dark:text-white' : 'text-white'}`}
                >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </div>

                <span className={`text-base font-bold truncate flex-1 text-center px-4 transition-opacity duration-300 ${scrollY > 200 ? 'opacity-100' : 'opacity-0'} text-gray-900 dark:text-white`}>
                    {info.name}
                </span>

                <button
                    onClick={onOpenSearch}
                    className={`w-10 h-10 flex items-center justify-center rounded-full active:bg-black/10 dark:active:bg-white/10 transition-colors ${scrollY > 200 ? 'text-gray-900 dark:text-white' : 'text-white'}`}
                >
                    <Search size={22} />
                </button>
            </div>

            {/* --- Scrollable Content Container --- */}
            <div
                className="h-full overflow-y-auto no-scrollbar scroll-smooth overscroll-none"
                onScroll={(e) => setScrollY(e.currentTarget.scrollTop)}
            >
                {/* --- Hero Section (Immersive) --- */}
                <div className="relative w-full h-[380px] shrink-0">
                    <div className="absolute inset-0 z-0">
                        <img src={info.coverImgUrl} className="w-full h-full object-cover blur-3xl opacity-50 dark:opacity-40 scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-end px-6 pb-12 pt-[calc(env(safe-area-inset-top)+30px)]">
                        <div className="flex space-x-5 items-end mb-4">
                            <motion.img
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                src={info.coverImgUrl}
                                className="w-32 h-32 rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.4)] object-cover flex-shrink-0 border border-white/10"
                            />
                            <div className="flex-1 min-w-0 flex flex-col space-y-2 pb-1 text-white shadow-black/80 drop-shadow-md">
                                <h1 className="text-2xl font-bold leading-tight line-clamp-2">
                                    {info.name}
                                </h1>
                                {info.creator && (
                                    <div className="flex items-center space-x-2 opacity-90">
                                        <img src={info.creator.avatarUrl} className="w-5 h-5 rounded-full border border-white/20" />
                                        <span className="text-xs font-medium">{info.creator.nickname}</span>
                                    </div>
                                )}
                                {info.description && (
                                    <p className="text-[11px] opacity-80 line-clamp-1">{info.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center justify-between">
                            <div className="flex space-x-3">
                                <button
                                    onClick={handleSubscribe}
                                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 backdrop-blur-md ${subscribed
                                        ? 'bg-white/20 text-white/80 border border-white/10'
                                        : 'bg-[#FF3A3A] text-white shadow-lg shadow-red-500/30 border border-transparent'
                                        }`}
                                >
                                    {subscribed ? <Check size={14} /> : <Plus size={14} />}
                                    <span>{subscribed ? '已收藏' : '收藏'}</span>
                                </button>
                                <button
                                    onClick={() => showToast("分享功能开发中", "info")}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/10 active:bg-white/20 transition-colors"
                                >
                                    <Share2 size={16} />
                                </button>
                            </div>
                            {/* Play All Button (Floating Right) */}
                            <button
                                onClick={handlePlayAll}
                                className="flex items-center space-x-2 bg-white text-black px-5 py-2.5 rounded-full shadow-xl active:scale-95 transition-transform"
                            >
                                <Play size={18} fill="currentColor" />
                                <span className="text-sm font-bold">播放</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- Song List Section (Rounded Card) --- */}
                <div className="relative z-20 -mt-6 bg-[#F5F5F7] dark:bg-black rounded-t-[32px] min-h-[calc(100vh-380px)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                    {/* List Header/Filter Bar */}
                    <div className="sticky top-0 z-30 bg-[#F5F5F7]/95 dark:bg-black/95 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 rounded-t-[32px]">
                        <div className="flex items-center space-x-1">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">全部歌曲</span>
                            <span className="text-xs text-gray-400 font-medium">({songs.length})</span>
                        </div>
                    </div>

                    <div className="pb-40 px-2 pt-2">
                        {songs.map((song, i) => (
                            <div
                                key={song.id}
                                onClick={() => onPlaySong(song, songs)}
                                className="flex items-center px-3 py-3.5 space-x-4 active:bg-gray-200/50 dark:active:bg-white/10 cursor-pointer rounded-2xl group transition-colors"
                            >
                                <span className="text-sm font-bold text-gray-300 w-6 text-center group-hover:text-red-500 transition-colors">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[15px] font-medium text-gray-900 dark:text-white truncate group-hover:text-red-500 transition-colors">{song.name}</h4>
                                    <div className="flex items-center mt-1 space-x-1.5 h-4">
                                        {(song.sq || song.hr) && <span className="text-[9px] border border-red-500/40 text-red-500 px-0.5 rounded-[3px] scale-90 origin-left font-medium">SQ</span>}
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                            {song.ar?.map(a => a.name).join('/')} - {song.al?.name}
                                        </p>
                                    </div>
                                </div>
                                <button className="text-gray-300 dark:text-gray-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SongListView;
