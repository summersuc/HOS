import React, { useState, useEffect } from 'react';
import { MusicService } from '../../../services/MusicService';
import { Search, Calendar, ChevronRight, Radio, Heart, Infinity as InfinityIcon, Play, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

const DiscoveryView = ({ userId, onSelectPlaylist, onPlaySong, onOpenSearch }) => {
    // Data States
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

    const loadRecommendations = async () => {
        setLoading(true);
        try {
            const [plRes, songRes, fmRes] = await Promise.all([
                MusicService.getRecommendPlaylists(),
                MusicService.getRecommendSongs(),
                MusicService.getPersonalFM()
            ]);

            if (plRes?.recommend) {
                setAllRecmdPlaylists(plRes.recommend);
                setRecmdPlaylists(plRes.recommend.slice(0, 5));
            }
            if (songRes?.data?.dailySongs) setTodaySongs(songRes.data.dailySongs);
            if (fmRes?.data) setPrivateFM(fmRes.data);

            if (userId) {
                const likeRes = await MusicService.getLikelist(userId);
                if (likeRes?.ids && likeRes.ids.length > 0) {
                    const ids = likeRes.ids.slice(0, 20).join(',');
                    const detailRes = await MusicService.getSongDetail(ids);
                    if (detailRes?.songs) setLikedSongs(detailRes.songs);
                }
            }
        } catch (e) {
            console.error("Failed to load discovery:", e);
        }
        setLoading(false);
    };

    // Helper to generic play
    const handlePlayList = (list) => {
        if (list && list.length > 0) {
            onPlaySong(list[0], list);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-y-auto pb-32 bg-[#F5F5F7] dark:bg-black scroll-smooth">
            {/* Search Bar Input - Clicking opens SearchOverlay */}
            <div className="sticky top-0 z-20 px-4 py-3 bg-[#F5F5F7]/90 dark:bg-black/90 backdrop-blur-md transition-colors duration-300">
                <div
                    onClick={onOpenSearch}
                    className="flex items-center space-x-2 bg-white dark:bg-white/10 p-2.5 rounded-full shadow-sm cursor-pointer"
                >
                    <Search size={18} className="text-gray-400 ml-1" />
                    <span className="text-sm text-gray-400 font-medium">Search songs, artists, playlists...</span>
                </div>
            </div>

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
                            Daily<br />Recommend
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
                            Private<br />Radar
                        </div>
                        <div className="absolute top-3 right-3 opacity-50">
                            <Radio size={20} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="absolute bottom-0 w-full h-[60%] bg-gradient-to-t from-gray-100 dark:from-white/5 to-transparent flex items-end justify-center pb-2">
                            <div className="text-[10px] text-gray-400 font-medium">Auto-Curated</div>
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
                            Private<br />Roaming
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
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Recommended Playlists</h3>
                    <div
                        onClick={() => setShowAllPlaylists(!showAllPlaylists)}
                        className="px-2 py-1 rounded-full border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500 flex items-center cursor-pointer active:bg-gray-100 dark:active:bg-white/10 transition-colors"
                    >
                        {showAllPlaylists ? "Less" : "More"} <ChevronRight size={10} className={`transform transition-transform ${showAllPlaylists ? 'rotate-90' : ''}`} />
                    </div>
                </div>

                {showAllPlaylists ? (
                    <div className="px-4 grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                        {allRecmdPlaylists.map((pl) => (
                            <motion.div
                                key={pl.id}
                                onClick={() => onSelectPlaylist(pl.id)}
                                className="flex flex-col space-y-2 cursor-pointer active:scale-95 transition-transform"
                            >
                                <div className="aspect-square rounded-xl overflow-hidden shadow-sm relative bg-gray-200 dark:bg-white/5">
                                    <img src={pl.picUrl} className="w-full h-full object-cover" loading="lazy" />
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
                                onClick={() => onSelectPlaylist(pl.id)}
                                className="flex-shrink-0 w-28 snap-start flex flex-col space-y-2 cursor-pointer group active:scale-95 transition-transform"
                            >
                                <div className="aspect-square rounded-xl overflow-hidden shadow-sm relative bg-gray-200 dark:bg-white/5">
                                    <img src={pl.picUrl} className="w-full h-full object-cover" loading="lazy" />
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
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Favorites & Recommendations</h3>
                    <div className="px-2 py-1 rounded-full border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500 flex items-center cursor-pointer">
                        Play All <ChevronRight size={10} />
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
                            <h4 className="font-bold text-sm dark:text-white truncate">My Liked Music</h4>
                            <p className="text-xs text-gray-500 truncate">
                                {likedSongs.length > 0 ? `Play ${likedSongs.length} recent favorites` : 'Your heart collection'}
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
                            <img src={song.al?.picUrl} className="w-12 h-12 rounded-lg object-cover mr-3 flex-shrink-0 bg-gray-200" loading="lazy" />
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
};

export default DiscoveryView;
