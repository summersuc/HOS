import React, { useState, useEffect } from 'react';
import { Search, X, Music, List, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MusicService } from '../../../services/MusicService';

const MusicPickerModal = ({ onClose, onSelect, userId }) => {
    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'playlist'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Playlist State
    const [playlists, setPlaylists] = useState([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);

    const [currentUserId, setCurrentUserId] = useState(userId);

    // Sync prop to state
    useEffect(() => {
        if (userId) setCurrentUserId(userId);
    }, [userId]);

    // Auto-detect login if no ID provided
    useEffect(() => {
        if (!currentUserId) {
            const checkLogin = async () => {
                try {
                    const res = await MusicService.checkLogin();
                    if (res?.data?.profile?.userId) {
                        setCurrentUserId(res.data.profile.userId);
                    }
                } catch (e) {
                    console.error("Auto-login check failed", e);
                }
            };
            checkLogin();
        }
    }, [currentUserId]);

    useEffect(() => {
        if (activeTab === 'playlist' && playlists.length === 0 && currentUserId) {
            loadPlaylists();
        }
    }, [activeTab, currentUserId]);

    const loadPlaylists = async () => {
        setLoadingPlaylists(true);
        try {
            const res = await MusicService.getUserPlaylist(currentUserId);
            if (res?.playlist) {
                setPlaylists(res.playlist);
            }
        } catch (e) {
            console.error(e);
        }
        setLoadingPlaylists(false);
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const res = await MusicService.search(searchQuery, 20, 0, 1); // 1 = Song
            if (res?.result?.songs) {
                setSearchResults(res.result.songs);
            } else {
                setSearchResults([]);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const formatArtist = (artists) => {
        return artists?.map(a => a.name).join(' / ') || '未知歌手';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="w-full sm:w-[400px] bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl h-[80vh] sm:h-[600px] flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#2C2C2E] border-b border-gray-200 dark:border-white/5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">分享音乐</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500 dark:text-gray-300">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-white dark:bg-[#2C2C2E]">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'search' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-400'}`}
                    >
                        <Search size={16} />
                        搜索
                    </button>
                    <button
                        onClick={() => setActiveTab('playlist')}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'playlist' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-400'}`}
                    >
                        <List size={16} />
                        我的歌单
                    </button>
                </div>

                {/* Search Body */}
                {activeTab === 'search' && (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-3">
                            <form onSubmit={handleSearch} className="relative">
                                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    autoFocus
                                    className="w-full bg-white dark:bg-black/20 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none dark:text-white"
                                    placeholder="搜索歌曲..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <button type="submit" className="hidden" />
                            </form>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
                            {loading && <div className="text-center py-8 text-gray-400 text-xs">搜索中...</div>}
                            {!loading && searchResults.length === 0 && searchQuery && (
                                <div className="text-center py-8 text-gray-400 text-xs">无搜索结果</div>
                            )}
                            {searchResults.map(song => (
                                <div
                                    key={song.id}
                                    onClick={() => onSelect({
                                        songId: song.id,
                                        title: song.name,
                                        artist: formatArtist(song.ar || song.artists),
                                        cover: song.al?.picUrl || song.album?.artist?.img1v1Url, // Fallback
                                        type: 'song'
                                    })}
                                    className="flex items-center gap-3 p-2 rounded-xl active:bg-gray-200 dark:active:bg-white/10 cursor-pointer"
                                >
                                    <img src={song.al?.picUrl} className="w-10 h-10 rounded-lg bg-gray-200 object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{song.name}</h4>
                                        <p className="text-xs text-gray-500 truncate">{formatArtist(song.ar || song.artists)}</p>
                                    </div>
                                    <button className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-bold shrink-0">发送</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Playlist Body */}
                {activeTab === 'playlist' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-3 py-2 space-y-2">
                        {loadingPlaylists && <div className="text-center py-8 text-gray-400 text-xs">加载中...</div>}
                        {!currentUserId && !loadingPlaylists && (
                            <div className="text-center py-12 px-4">
                                <p className="text-sm text-gray-500 mb-2">需要登录网易云音乐账号</p>
                                <p className="text-xs text-gray-400">请前往音乐App登录</p>
                            </div>
                        )}
                        {playlists.map(pl => (
                            <div
                                key={pl.id}
                                onClick={() => onSelect({
                                    songId: pl.id,
                                    title: pl.name,
                                    artist: pl.creator?.nickname,
                                    cover: pl.coverImgUrl,
                                    trackCount: pl.trackCount,
                                    type: 'playlist'
                                })}
                                className="flex items-center gap-3 p-2 rounded-xl active:bg-gray-200 dark:active:bg-white/10 cursor-pointer"
                            >
                                <img src={pl.coverImgUrl} className="w-12 h-12 rounded-lg bg-gray-200 object-cover" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{pl.name}</h4>
                                    <p className="text-xs text-gray-500 truncate">{pl.trackCount}首 · {pl.creator?.nickname}</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-400" />
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default MusicPickerModal;
