import React, { useState, useEffect } from 'react';
import IOSPage from '../../components/AppWindow/IOSPage';
import { MusicService } from '../../services/MusicService';
import LoginPage from './LoginPage';
import PlaylistView from './components/PlaylistView';
import SongListView from './components/SongListView';
import DiscoveryView from './components/DiscoveryView';
import Player from './components/Player';
import SearchOverlay from './components/SearchOverlay';
import ProfileHeader from './components/ProfileHeader';
import { useAudio } from '../../hooks/useAudio';
import { useToast } from '../../components/common/Toast';
import { AnimatePresence, motion } from 'framer-motion';

const MusicApp = ({ onClose }) => {
    // Auth & Data State
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Toast
    const { showToast, ToastComponent } = useToast();

    // Navigation State: 'discovery' | 'playlists' | 'songs'
    const [view, setView] = useState('discovery');
    const [activePlaylistId, setActivePlaylistId] = useState(null);

    // Player State
    const [showPlayer, setShowPlayer] = useState(false);

    // Search Overlay State (lifted from DiscoveryView)
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchType, setSearchType] = useState(1);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchLoadingMore, setSearchLoadingMore] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [searchOffset, setSearchOffset] = useState(0);
    const [searchHasMore, setSearchHasMore] = useState(true);
    const SEARCH_LIMIT = 30;

    const {
        audio, isPlaying, progress, duration, currentTrack,
        playTrack, togglePlay, playNextTrack, playPrevTrack,
        mode, toggleMode
    } = useAudio();

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        setIsLoading(true);
        const res = await MusicService.checkLogin();
        if (res?.data?.profile) {
            setProfile(res.data.profile);
        }
        setIsLoading(false);
    };

    const handleLoginSuccess = () => {
        checkLoginStatus();
    };

    const handleSelectPlaylist = (id) => {
        setActivePlaylistId(id);
        setView('songs');
    };

    // Unified Play Handler
    const handlePlaySong = async (song, songList = []) => {
        const res = await MusicService.getSongUrl(song.id);
        const url = res?.data?.[0]?.url;

        if (url) {
            await playTrack(song, url, songList);
            setShowPlayer(true);
        } else {
            console.warn("Song URL restricted", res);
            showToast("Song unavailable", "error");
        }
    };

    // Next / Prev Handlers
    const handleNext = async () => {
        const nextTrack = playNextTrack();
        if (nextTrack) {
            const res = await MusicService.getSongUrl(nextTrack.id);
            const url = res?.data?.[0]?.url;
            if (url) playTrack(nextTrack, url);
        }
    };

    const handlePrev = async () => {
        const prevTrack = playPrevTrack();
        if (prevTrack) {
            const res = await MusicService.getSongUrl(prevTrack.id);
            const url = res?.data?.[0]?.url;
            if (url) playTrack(prevTrack, url);
        }
    };

    // Search Logic (for SearchOverlay)
    const handleSearchOpen = () => {
        setShowSearch(true);
    };

    const handleSearchClose = () => {
        setShowSearch(false);
        setSearchResults([]);
        setSearchQuery('');
        setSearchOffset(0);
        setSearchHasMore(true);
    };

    const handleSearch = async (typeOverride, isLoadMore = false) => {
        const typeToUse = typeOverride || searchType;
        const currentOffset = isLoadMore ? searchOffset + SEARCH_LIMIT : 0;

        if (!searchQuery.trim()) return;

        if (isLoadMore) setSearchLoadingMore(true);
        else setSearchLoading(true);
        setSearchError(null);

        try {
            const res = await MusicService.search(searchQuery, SEARCH_LIMIT, currentOffset, typeToUse);
            if (res?.error) {
                setSearchError(res.message || "Network error");
                setSearchLoading(false);
                setSearchLoadingMore(false);
                return;
            }
            if (!res || !res.result) {
                if (res?.code === 200) {
                    if (!isLoadMore) setSearchResults([]);
                    setSearchHasMore(false);
                } else {
                    setSearchError("Server returned empty data");
                }
                setSearchLoading(false);
                setSearchLoadingMore(false);
                return;
            }

            let results = [];
            const r = res.result;
            if (typeToUse === 1) results = r.songs || [];
            else if (typeToUse === 1000) results = r.playlists || r.playLists || [];
            else if (typeToUse === 10) results = r.albums || [];
            else if (typeToUse === 100) results = r.artists || [];
            else if (typeToUse === 1004) results = r.mvs || [];
            else if (typeToUse === 1009) results = r.djRadios || [];
            else if (typeToUse === 1002) results = r.userprofiles || [];
            else results = r.songs || r.playlists || r.albums || r.artists || r.mvs || r.djRadios || [];

            if (!Array.isArray(results)) results = [];

            if (isLoadMore) {
                setSearchResults(prev => [...prev, ...results]);
                setSearchOffset(currentOffset);
            } else {
                setSearchResults(results);
                setSearchOffset(0);
            }
            setSearchHasMore(results.length >= SEARCH_LIMIT);
        } catch (err) {
            setSearchError("Unexpected error");
        }
        setSearchLoading(false);
        setSearchLoadingMore(false);
    };

    const handleLoadMore = () => {
        handleSearch(searchType, true);
    };

    // Mini Player Bar
    const MiniPlayer = () => currentTrack && (
        <div
            onClick={() => setShowPlayer(true)}
            className="absolute bottom-12 left-2 right-2 h-[56px] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-full border border-black/5 dark:border-white/10 flex items-center px-2 pr-4 justify-between z-30 cursor-pointer shadow-2xl shadow-black/20"
        >
            <div className="flex items-center space-x-3">
                <div className="relative w-10 h-10 ml-1">
                    <img
                        src={currentTrack.al?.picUrl}
                        className={`w-full h-full rounded-full shadow-sm bg-gray-200 border border-black/10 dark:border-white/10 ${isPlaying ? 'animate-spin-slow' : ''}`}
                        style={{ animationDuration: '8s' }}
                        alt={currentTrack.name}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-black dark:bg-[#1C1C1E] rounded-full" />
                    </div>
                </div>
                <div className="text-xs max-w-[180px]">
                    <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{currentTrack.name}</p>
                    <p className="text-gray-500 line-clamp-1">{currentTrack.ar?.[0]?.name}</p>
                </div>
            </div>
            <div className="flex items-center space-x-3">
                <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 active:scale-95 transition"
                >
                    {isPlaying ? (
                        <span className="text-xs text-gray-900 dark:text-white font-black">||</span>
                    ) : (
                        <span className="text-xs text-gray-900 dark:text-white font-black pl-0.5">▶</span>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <IOSPage
                title={
                    view === 'discovery' ? "Discovery" :
                        view === 'playlists' ? "Mine" :
                            "Playlist"
                }
                onBack={view === 'songs' ? () => setView('playlists') : onClose}
                enableEnterAnimation={false}
                showBackButton={false}
            >
                <div className="h-full bg-[#f2f2f7] dark:bg-black flex flex-col relative overflow-hidden text-gray-900 dark:text-white font-sans">
                    {isLoading ? (
                        <div className="flex items-center justify-center flex-1">
                            <span className="text-sm opacity-50 font-medium animate-pulse">Loading Netease...</span>
                        </div>
                    ) : !profile ? (
                        <LoginPage onLoginSuccess={handleLoginSuccess} />
                    ) : (
                        <>
                            {/* Main Content Area */}
                            <div className="flex-1 overflow-hidden relative z-10">
                                <AnimatePresence mode="wait">
                                    {view === 'discovery' && (
                                        <motion.div
                                            key="discovery"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="h-full"
                                        >
                                            <DiscoveryView
                                                userId={profile.userId}
                                                onSelectPlaylist={handleSelectPlaylist}
                                                onPlaySong={handlePlaySong}
                                                onOpenSearch={handleSearchOpen}
                                            />
                                        </motion.div>
                                    )}
                                    {view === 'playlists' && (
                                        <motion.div
                                            key="playlists"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="h-full overflow-y-auto no-scrollbar scroll-smooth"
                                        >
                                            <div className="pt-2 pb-4 space-y-4">
                                                <ProfileHeader profile={profile} />
                                                <PlaylistView userId={profile.userId} onSelectPlaylist={handleSelectPlaylist} />
                                            </div>
                                        </motion.div>
                                    )}
                                    {view === 'songs' && (
                                        <motion.div
                                            key="songs"
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 50 }}
                                            className="h-full bg-white dark:bg-[#121212]"
                                        >
                                            <SongListView
                                                playlistId={activePlaylistId}
                                                onBack={() => setView('playlists')}
                                                onPlaySong={handlePlaySong}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Bottom Tab Bar */}
                            {view !== 'songs' && (
                                <div className="absolute bottom-0 left-0 w-full h-[88px] pb-5 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md border-t border-gray-200/50 dark:border-white/5 flex items-start justify-around pt-2 z-20">
                                    <button
                                        onClick={() => setView('discovery')}
                                        className={`flex flex-col items-center space-y-1 ${view === 'discovery' ? 'text-red-500' : 'text-gray-400'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${view === 'discovery' ? 'bg-red-500/10' : ''}`}>
                                            <span className="text-xl">◎</span>
                                        </div>
                                        <span className="text-[10px] font-medium">Discovery</span>
                                    </button>
                                    <button
                                        onClick={() => setView('playlists')}
                                        className={`flex flex-col items-center space-y-1 ${view === 'playlists' ? 'text-red-500' : 'text-gray-400'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${view === 'playlists' ? 'bg-red-500/10' : ''}`}>
                                            <span className="text-xl">♫</span>
                                        </div>
                                        <span className="text-[10px] font-medium">Mine</span>
                                    </button>
                                </div>
                            )}

                            {/* Mini Player */}
                            <MiniPlayer />
                        </>
                    )}
                </div>
            </IOSPage>

            <ToastComponent />

            {/* Full Screen Player Overlay - Moved outside IOSPage to ensure actual fullscreen */}
            <AnimatePresence>
                {showPlayer && (
                    <Player
                        track={currentTrack}
                        isPlaying={isPlaying}
                        progress={progress}
                        duration={duration}
                        onTogglePlay={togglePlay}
                        onClose={() => setShowPlayer(false)}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        mode={mode}
                        onToggleMode={toggleMode}
                    />
                )}
            </AnimatePresence>

            {/* Search Overlay - Parallel to Player */}
            <AnimatePresence>
                {showSearch && (
                    <SearchOverlay
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        searchResults={searchResults}
                        searchType={searchType}
                        setSearchType={setSearchType}
                        loading={searchLoading}
                        loadingMore={searchLoadingMore}
                        error={searchError}
                        hasMore={searchHasMore}
                        onSearch={handleSearch}
                        onLoadMore={handleLoadMore}
                        onClose={handleSearchClose}
                        onPlaySong={handlePlaySong}
                        onSelectPlaylist={handleSelectPlaylist}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default MusicApp;
