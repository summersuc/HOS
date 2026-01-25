import React, { useState, useEffect, memo } from 'react';
import { MusicService } from '../../../services/MusicService';
import { Search, Calendar, ChevronRight, Radio, Heart, Infinity as InfinityIcon, Play, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

const DiscoveryView = memo(({ userId, onSelectPlaylist, onPlaySong, onOpenSearch, setGlobalLoading }) => {
    // Data States
    const [banners, setBanners] = useState([]);
    const [toplists, setToplists] = useState([]);
    const [recmdPlaylists, setRecmdPlaylists] = useState([]);
    const [allRecmdPlaylists, setAllRecmdPlaylists] = useState([]);
    const [showAllPlaylists, setShowAllPlaylists] = useState(false);

    const [todaySongs, setTodaySongs] = useState([]);
    const [privateFM, setPrivateFM] = useState([]);
    const [likedSongs, setLikedSongs] = useState([]);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadRecommendations();
    }, [userId]);

    const CACHE_KEY = 'hos_music_discovery_cache';
    const CACHE_EXPIRY = 3600 * 1000; // 1 hour

    const loadRecommendations = async () => {
        // 1. Try Load from Cache
        let cached = null;
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                cached = JSON.parse(raw);
                if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
                    // Valid cache - use it immediately
                    setBanners(cached.banners || []);
                    setToplists(cached.toplists || []);
                    setRecmdPlaylists(cached.recmdPlaylists || []);
                    setAllRecmdPlaylists(cached.allRecmdPlaylists || []);
                    setTodaySongs(cached.todaySongs || []);
                    setPrivateFM(cached.privateFM || []);
                    setLikedSongs(cached.likedSongs || []);
                    setLoading(false);
                    if (setGlobalLoading) setGlobalLoading(false);
                } else {
                    cached = null; // Expired
                }
            }
        } catch (e) {
            console.error("Cache read error", e);
        }

        if (!cached) setLoading(true);

        // 2. Fetch Fresh Data (Stale-while-revalidate)
        try {
            const [bannerRes, toplistRes, plRes, songRes, fmRes] = await Promise.all([
                MusicService.getBanners(),
                MusicService.getToplists(),
                MusicService.getRecommendPlaylists(),
                MusicService.getRecommendSongs(),
                MusicService.getPersonalFM()
            ]);

            const newBanners = bannerRes?.banners?.slice(0, 5) || [];
            const newToplists = toplistRes?.list?.slice(0, 4) || [];

            let newRecmdPlaylists = [];
            let newAllRecmdPlaylists = [];
            if (plRes?.recommend) {
                newAllRecmdPlaylists = plRes.recommend;
                newRecmdPlaylists = plRes.recommend.slice(0, 5);
            }

            const newTodaySongs = songRes?.data?.dailySongs || [];
            const newPrivateFM = fmRes?.data || [];

            let newLikedSongs = [];
            if (userId) {
                const likeRes = await MusicService.getLikelist(userId);
                if (likeRes?.ids && likeRes.ids.length > 0) {
                    const ids = likeRes.ids.slice(0, 20).join(',');
                    const detailRes = await MusicService.getSongDetail(ids);
                    if (detailRes?.songs) newLikedSongs = detailRes.songs;
                }
            }

            // Update State
            setBanners(newBanners);
            setToplists(newToplists);
            setRecmdPlaylists(newRecmdPlaylists);
            setAllRecmdPlaylists(newAllRecmdPlaylists);
            setTodaySongs(newTodaySongs);
            setPrivateFM(newPrivateFM);
            setLikedSongs(newLikedSongs);

            // Save Cache
            const cacheData = {
                timestamp: Date.now(),
                banners: newBanners,
                toplists: newToplists,
                recmdPlaylists: newRecmdPlaylists,
                allRecmdPlaylists: newAllRecmdPlaylists,
                todaySongs: newTodaySongs,
                privateFM: newPrivateFM,
                likedSongs: newLikedSongs
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

        } catch (e) {
            console.error("Failed to load discovery:", e);
        }
        setLoading(false);
        // Signal global loading to stop
        if (setGlobalLoading) setGlobalLoading(false);
    };


    // Helper to generic play
    const handlePlayList = (list) => {
        if (list && list.length > 0) {
            onPlaySong(list[0], list);
        }
    };

    // --- Skeleton Loader Component ---
    if (loading) {
        return (
            <div className="h-full flex flex-col bg-[#F5F5F7] dark:bg-black p-4 space-y-6 overflow-hidden">
                {/* Search Skeleton */}
                <div className="h-10 bg-white dark:bg-white/10 rounded-full w-full animate-pulse" />

                {/* Banner Skeleton */}
                <div className="w-full aspect-[2.4/1] bg-gray-200 dark:bg-white/5 rounded-2xl animate-pulse" />

                {/* Toplist Grid Skeleton */}
                <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-16 bg-white dark:bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>

                {/* List Skeleton */}
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/5 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-1/2 animate-pulse" />
                                <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-1/4 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-y-auto pb-32 bg-[#F5F5F7] dark:bg-black scroll-smooth overscroll-contain" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 80px)' }}>
            {/* Search Bar Removed (Handled by MusicApp) */}

            {/* --- 0. Banner Carousel --- */}
            {banners.length > 0 && (
                <div className="px-4 mb-4">
                    <div
                        className="flex overflow-x-auto snap-x snap-mandatory pb-2 space-x-3 touch-pan-x no-scrollbar"
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        {banners.map((banner, i) => (
                            <motion.div
                                key={banner.targetId || i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex-shrink-0 snap-center w-[85%] aspect-[2.4/1] rounded-2xl overflow-hidden shadow-lg relative cursor-pointer"
                            >
                                <img
                                    src={banner.imageUrl || banner.pic}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    alt={banner.typeTitle}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.classList.add('bg-gradient-to-br', 'from-gray-200', 'to-gray-300', 'dark:from-white/10', 'dark:to-white/5');
                                    }}
                                />
                                {banner.typeTitle && (
                                    <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] text-white font-medium">
                                        {banner.typeTitle}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- 0.5 Toplists Quick Access --- */}
            {toplists.length > 0 && (
                <div className="px-4 mb-5">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2 px-1">排行榜</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {toplists.map((list) => (
                            <motion.div
                                key={list.id}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelectPlaylist(list.id, list)} // Pass entire object
                                className="flex items-center bg-white dark:bg-white/5 rounded-xl p-2.5 shadow-sm cursor-pointer border border-black/5 dark:border-white/5"
                            >
                                <img
                                    src={list.coverImgUrl}
                                    className="w-11 h-11 rounded-lg object-cover mr-2.5 flex-shrink-0 bg-gray-200 dark:bg-white/10"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.classList.add('flex', 'items-center', 'justify-center');
                                        e.target.parentElement.insertAdjacentHTML('afterbegin', '<div class="w-11 h-11 rounded-lg bg-gray-200 dark:bg-white/10 mr-2.5 flex items-center justify-center text-[10px] text-gray-400">榜</div>');
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{list.name}</h4>
                                    <p className="text-[10px] text-gray-400 truncate">{list.updateFrequency}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- 1. Top Carousel (Daily, Radar, Roaming) --- */}
            <div className="mb-6 overflow-hidden">
                <div
                    className="flex overflow-x-auto snap-x px-4 space-x-3 pb-2 pt-1 touch-pan-x"
                    style={{ scrollBehavior: 'smooth' }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    {/* Daily Recommend */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePlayList(todaySongs)}
                        className="flex-shrink-0 snap-center relative w-[130px] h-[160px] rounded-[16px] overflow-hidden cursor-pointer shadow-lg shadow-red-500/10"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FF4B4B] to-[#FF2C2C]" />
                        <div className="absolute top-3 left-3 text-white font-bold text-base leading-tight z-10">
                            每日<br />推荐
                        </div>
                        <div className="absolute bottom-3 left-3 flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-md rounded-full border border-white/20 z-10">
                            <Calendar size={16} className="text-white" />
                            <span className="absolute text-[8px] font-bold text-white pt-1">{new Date().getDate()}</span>
                        </div>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-[100px]" />
                    </motion.div>

                    {/* Private Radar */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePlayList([...todaySongs].reverse())}
                        className="flex-shrink-0 snap-center relative w-[130px] h-[160px] rounded-[16px] overflow-hidden cursor-pointer bg-white dark:bg-[#1C1C1E] shadow-sm border border-gray-100 dark:border-white/5"
                    >
                        <div className="absolute top-3 left-3 text-gray-900 dark:text-white font-bold text-base leading-tight">
                            私人<br />雷达
                        </div>
                        <div className="absolute top-3 right-3 opacity-50">
                            <Radio size={20} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="absolute bottom-0 w-full h-[60%] bg-gradient-to-t from-gray-100 dark:from-white/5 to-transparent flex items-end justify-center pb-2">
                            <div className="text-[10px] text-gray-400 font-medium">猜你喜欢</div>
                        </div>
                    </motion.div>

                    {/* Private Roaming (FM) */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePlayList(privateFM)}
                        className="flex-shrink-0 snap-center relative w-[130px] h-[160px] rounded-[16px] overflow-hidden cursor-pointer bg-black shadow-md border border-white/10"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#2C2C2E] to-[#000000]" />
                        <div className="absolute top-3 left-3 text-white font-bold text-base leading-tight">
                            私人<br />漫游
                        </div>
                        <div className="absolute bottom-3 left-3 flex items-center justify-center w-8 h-8 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                            <InfinityIcon size={16} className="text-white" />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* --- 2. Recommended Playlists (Account) --- */}
            <div className="mb-4 pl-1">
                <div className="px-4 mb-3 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">推荐歌单</h3>
                    <div
                        onClick={() => setShowAllPlaylists(!showAllPlaylists)}
                        className="px-2 py-1 rounded-full border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500 flex items-center cursor-pointer active:bg-gray-100 dark:active:bg-white/10 transition-colors"
                    >
                        {showAllPlaylists ? "收起" : "更多"} <ChevronRight size={10} className={`transform transition-transform ${showAllPlaylists ? 'rotate-90' : ''}`} />
                    </div>
                </div>

                {showAllPlaylists ? (
                    <div className="px-4 grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                        {allRecmdPlaylists.map((pl) => (
                            <motion.div
                                key={pl.id}
                                onClick={() => onSelectPlaylist(pl.id, pl)} // Pass full object
                                className="flex flex-col space-y-2 cursor-pointer active:scale-95 transition-transform"
                            >
                                <div className="aspect-square rounded-xl overflow-hidden shadow-sm relative bg-gray-200 dark:bg-white/5 flex items-center justify-center">
                                    <img
                                        src={pl.picUrl}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML += '<span class="text-xs text-gray-400">♫</span>';
                                        }}
                                    />
                                    <div className="absolute top-1 right-1 bg-black/40 backdrop-blur-sm px-1.5 rounded-full text-[9px] text-white font-medium flex items-center">
                                        <span className="mr-0.5">▶</span> {(pl.playcount / 10000).toFixed(0)}w
                                    </div>
                                </div>
                                <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
                                    {pl.name}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div
                        className="flex overflow-x-auto bg-transparent px-4 space-x-3 pb-2 snap-x touch-pan-x"
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        {recmdPlaylists.map((pl, i) => (
                            <motion.div
                                key={pl.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                onClick={() => onSelectPlaylist(pl.id, pl)} // Pass full object
                                className="flex-shrink-0 w-28 snap-start flex flex-col space-y-2 cursor-pointer group active:scale-95 transition-transform"
                            >
                                <div className="aspect-square rounded-xl overflow-hidden shadow-sm relative bg-gray-200 dark:bg-white/5 flex items-center justify-center">
                                    <img
                                        src={pl.picUrl}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML += '<span class="text-xs text-gray-400">♫</span>';
                                        }}
                                    />
                                    <div className="absolute top-1 right-1 bg-black/40 backdrop-blur-sm px-1.5 rounded-full text-[9px] text-white font-medium flex items-center">
                                        <span className="mr-0.5">▶</span> {(pl.playcount / 10000).toFixed(0)}w
                                    </div>
                                </div>
                                <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
                                    {pl.name}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- 3. Favorites & Recommendations --- */}
            <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">猜你喜欢</h3>
                    <div className="px-2 py-1 rounded-full border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500 flex items-center cursor-pointer">
                        播放全部 <ChevronRight size={10} />
                    </div>
                </div>

                <div className="flex flex-col space-y-2 rounded-2xl bg-white/60 dark:bg-white/5 p-2 backdrop-blur-sm border border-white/50 dark:border-white/5">
                    <div
                        onClick={() => handlePlayList(likedSongs)}
                        className="flex items-center p-2 rounded-xl bg-gradient-to-r from-white to-gray-50 dark:from-white/10 dark:to-white/5 shadow-sm active:scale-98 transition-transform cursor-pointer border border-white/50 dark:border-white/5"
                    >
                        <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mr-3 text-red-500 flex-shrink-0">
                            <Heart fill="currentColor" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm dark:text-white truncate">我喜欢的音乐</h4>
                            <p className="text-xs text-gray-500 truncate">
                                {likedSongs.length > 0 ? `播放 ${likedSongs.length} 首近期红心歌曲` : '你的红心收藏'}
                            </p>
                        </div>
                        <button className="text-red-500 px-2 py-1">
                            <div className="border border-red-200 dark:border-red-900/30 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg shadow-red-500/30">
                                <Play size={10} fill="currentColor" className="ml-0.5" />
                            </div>
                        </button>
                    </div>

                    {todaySongs.slice(0, 5).map((song) => (
                        <div
                            key={song.id}
                            onClick={() => onPlaySong(song, todaySongs)}
                            className="flex items-center p-2 rounded-xl active:bg-gray-100 dark:active:bg-white/10 transition-colors cursor-pointer"
                        >
                            <img
                                src={song.al?.picUrl}
                                className="w-12 h-12 rounded-lg object-cover mr-3 flex-shrink-0 bg-gray-200 dark:bg-white/10"
                                loading="lazy"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.classList.add('flex', 'items-center', 'justify-center');
                                    const placeholder = document.createElement('div');
                                    placeholder.className = 'w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 mr-3 flex items-center justify-center text-xs text-gray-400';
                                    placeholder.innerText = '♫';
                                    e.target.parentElement.insertBefore(placeholder, e.target);
                                }}
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm dark:text-white truncate">{song.name}</h4>
                                <p className="text-xs text-gray-500 truncate">
                                    {song.reason ? <span className="text-red-500 bg-red-500/10 px-1 rounded mr-1 text-[9px]">{song.reason}</span> : null}
                                    {song.ar?.[0]?.name} - {song.al?.name}
                                </p>
                            </div>
                            <button className="text-gray-300 dark:text-gray-600 p-2">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default DiscoveryView;
