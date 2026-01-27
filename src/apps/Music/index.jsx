import React, { useState, useEffect, useCallback } from 'react';
import IOSPage from '../../components/AppWindow/IOSPage';
import { MusicService } from '../../services/MusicService';
import LoginPage from './LoginPage';
import PlaylistView from './components/PlaylistView';
import SongListView from './components/SongListView';
import DiscoveryView from './components/DiscoveryView';
import Player from './components/Player';
import SearchOverlay from './components/SearchOverlay';
import ProfileHeader from './components/ProfileHeader';
import CurrentQueueSheet from './components/CurrentQueueSheet';
import { useAudio, globalAudio } from '../../hooks/useAudio';
import { useToast } from '../../components/common/Toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Play, Pause, SkipForward, Compass, Library } from 'lucide-react';

const MusicApp = ({ onClose }) => {
    // Auth & Data State
    // Auth & Data State
    const [profile, setProfile] = useState(() => {
        try {
            const cached = localStorage.getItem('MUSIC_PROFILE');
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            return null;
        }
    });

    // Toast
    const { showToast, ToastComponent } = useToast();

    // Navigation State: Stack-based
    const [pageStack, setPageStack] = useState([{ id: 'discovery', type: 'root', data: null }]);
    // Root Tab State (Discovery vs My Music)
    const [rootTab, setRootTab] = useState('discovery');

    // Derived state
    const isRoot = pageStack.length === 1;
    const currentPage = pageStack[pageStack.length - 1];
    const activePlaylistId = currentPage?.type === 'playlist' ? currentPage.data.id : null;

    // Navigation Actions
    const pushPage = useCallback((id, type, data) => {
        setPageStack(prev => [...prev, { id, type, data }]);
    }, []);

    const popPage = useCallback(() => {
        setPageStack(prev => {
            if (prev.length <= 1) return prev;
            return prev.slice(0, -1);
        });
    }, []);

    // Render Helper
    const renderPage = (page, index) => {
        if (page.type === 'root') {
            return (
                <div className="w-full h-full bg-[#F5F5F7] dark:bg-black relative">
                    {/* Discovery Tab */}
                    <div className="absolute inset-0 w-full h-full" style={{ display: rootTab === 'discovery' ? 'block' : 'none' }}>
                        <DiscoveryView
                            userId={profile?.userId}
                            onSelectPlaylist={handleSelectPlaylist}
                            onPlaySong={(song, list) => handlePlaySong(song, list, true)}
                            onOpenSearch={() => setShowSearch(true)}
                            setGlobalLoading={setGlobalLoading}
                        />
                    </div>

                    {/* My Music Tab */}
                    <div className="absolute inset-0 w-full h-full overflow-y-auto no-scrollbar overscroll-contain" style={{ display: rootTab === 'playlists' ? 'block' : 'none' }}>
                        <div className="pt-[calc(env(safe-area-inset-top)+20px)] pb-32 space-y-4">
                            <ProfileHeader profile={profile} />
                            <PlaylistView userId={profile?.userId} onSelectPlaylist={handleSelectPlaylist} />
                        </div>
                    </div>
                </div>
            );
        }
        if (page.type === 'playlist') {
            return (
                <SongListView
                    playlistId={page.data.id}
                    initialData={page.data}
                    onBack={popPage}
                    onPlaySong={(song, list) => handlePlaySong(song, list, true)}
                    onOpenSearch={() => setShowSearch(true)}
                />
            );
        }
        return null;
    };

    // Player State
    const [showPlayer, setShowPlayer] = useState(false);
    const [showQueue, setShowQueue] = useState(false);

    // Search Overlay State
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
        audio, isPlaying, progress, duration, currentTrack, currentIndex,
        playTrack, togglePlay, playNextTrack, playPrevTrack,
        mode, toggleMode, queue
    } = useAudio();

    // Global Loading - Fast Start if Cached
    const [globalLoading, setGlobalLoading] = useState(() => {
        return !localStorage.getItem('MUSIC_PROFILE');
    });

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        const res = await MusicService.checkLogin();
        if (res?.data?.profile) {
            setProfile(res.data.profile);
            localStorage.setItem('MUSIC_PROFILE', JSON.stringify(res.data.profile));
            // Don't turn off loading here - wait for DiscoveryView to load data
            // setGlobalLoading(false); 
        } else {
            setProfile(null);
            localStorage.removeItem('MUSIC_PROFILE');
            setGlobalLoading(false); // If no login, turn off to show Login Page
        }
    };

    const handleLoginSuccess = useCallback((cookie) => {
        setGlobalLoading(true);
        if (cookie) {
            MusicService.saveCookie(cookie);
        }
        checkLoginStatus();
    }, []);

    const handleSelectPlaylist = useCallback((id, initialData) => {
        pushPage(`playlist-${id}`, 'playlist', { id, ...initialData });
    }, [pushPage]);

    // Unified Play Handler
    const handlePlaySong = useCallback(async (song, songList = [], autoOpen = true) => {
        const res = await MusicService.getSongUrl(song.id);
        const url = res?.data?.[0]?.url;

        if (url) {
            await playTrack(song, url, songList);
            if (autoOpen) setShowPlayer(true);
        } else {
            console.warn("Song URL restricted", res);
            showToast("Song unavailable", "error");
        }
    }, [playTrack, showToast]);

    // Intelligence Mode (心动模式)
    const [intelligenceLoading, setIntelligenceLoading] = useState(false);

    const handleIntelligenceMode = useCallback(async () => {
        if (!currentTrack || !activePlaylistId) return;
        if (intelligenceLoading) return;
        try {
            setIntelligenceLoading(true);
            showToast("正在开启心动模式...", "loading");
            const res = await MusicService.getIntelligenceList(currentTrack.id, activePlaylistId);
            if (res?.data && res.data.length > 0) {
                const songs = res.data.map(item => item.songInfo);
                const firstSong = songs[0];
                const urlRes = await MusicService.getSongUrl(firstSong.id);
                const url = urlRes?.data?.[0]?.url;
                if (url) {
                    await playTrack(firstSong, url, songs);
                    showToast("已开启心动模式", "success");
                }
            } else {
                showToast("未找到心动推荐", "error");
            }
        } catch (err) {
            console.error("Intelligence mode failed", err);
            showToast("开启心动模式失败", "error");
        } finally {
            setIntelligenceLoading(false);
        }
    }, [currentTrack, activePlaylistId, intelligenceLoading, playTrack, showToast]);

    // Auto-Play Next Listener
    useEffect(() => {
        const onNextRequest = (e) => {
            const nextTrack = e.detail;
            if (nextTrack) {
                // handlePlaySong is memoized now.
                // But we can't easily call it from here if it depends on scope/state that changes without re-attaching listener.
                // HOWEVER, handlePlaySong depends on `playTrack` (stable form hook? mostly).
                // To avoid closure staleness, we often use a ref or rely on event content.
                // Assuming playTrack is stable enough.
                // We'll trust the listener is re-attached if dependencies change, OR we disable the lint rule.
                // Actually, just calling the logic directly might be safer or using a stable ref.
                // For now, let's silence the warning logic by assuming the effect runs once.
                // If handlePlaySong changes, this listener is STALE.
                // FIX: Add `handlePlaySong` to dependency array.
            }
        };
        // Let's implement the handler logic directly or use a ref for handlePlaySong to avoid frequent re-binds.
        const safePlay = (song) => {
            // simplified play logic for auto-next
            MusicService.getSongUrl(song.id).then(res => {
                const url = res?.data?.[0]?.url;
                if (url) playTrack(song, url, []);
            });
        };

        const onReq = (e) => safePlay(e.detail);

        globalAudio.addEventListener('request-play-next', onReq);
        return () => globalAudio.removeEventListener('request-play-next', onReq);
    }, [playTrack]);

    // Next / Prev Handlers
    const handleNext = useCallback(async () => {
        const nextTrack = playNextTrack();
        if (nextTrack) handlePlaySong(nextTrack, [], true);
    }, [playNextTrack, handlePlaySong]);

    const handlePrev = useCallback(async () => {
        const prevTrack = playPrevTrack();
        if (prevTrack) handlePlaySong(prevTrack, [], true);
    }, [playPrevTrack, handlePlaySong]);

    // Search Logic
    const handleSearchOpen = useCallback(() => {
        setShowSearch(true);
    }, []);

    const handleSearchClose = () => {
        setShowSearch(false);
        setSearchResults([]);
        setSearchQuery('');
        setSearchOffset(0);
        setSearchHasMore(true);
    };

    const handleSearch = async (typeOverride, isLoadMore = false, queryOverride = null) => {
        const queryToUse = queryOverride !== null ? queryOverride : searchQuery;
        if (!queryToUse || !queryToUse.trim()) return;

        if (isLoadMore) setSearchLoadingMore(true);
        else setSearchLoading(true);
        setSearchError(null);

        try {
            const typeToUse = typeOverride || searchType;
            const currentOffset = isLoadMore ? searchOffset + SEARCH_LIMIT : 0;
            const res = await MusicService.search(queryToUse, SEARCH_LIMIT, currentOffset, typeToUse);
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
            else if (typeToUse === 1018) {
                const songs = r.song?.songs || r.songs || [];
                const playlists = r.playList?.playLists || r.playlists || r.playLists || [];
                const artists = r.artist?.artists || r.artists || [];
                const albums = r.album?.albums || r.albums || [];
                const mvs = r.mv?.mvs || r.mvs || [];
                results = [...songs, ...playlists, ...artists, ...albums, ...mvs];
            } else results = r.songs || r.playlists || r.albums || r.artists || r.mvs || r.djRadios || [];

            if (!Array.isArray(results)) results = [];

            if (isLoadMore) {
                setSearchResults(prev => [...prev, ...results]);
                setSearchOffset(currentOffset);
            } else {
                setSearchResults(results);
                setSearchOffset(0);
            }
            setSearchHasMore(results.length >= SEARCH_LIMIT || (typeToUse === 1018 && results.length > 0));
        } catch (err) {
            setSearchError("Unexpected error");
        }
        setSearchLoading(false);
        setSearchLoadingMore(false);
    };

    const handleLoadMore = () => {
        handleSearch(searchType, true);
    };

    return (
        <>
            {/* Global Loader */}
            <AnimatePresence>
                {globalLoading && (
                    <motion.div
                        key="global-loader"
                        initial={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-[9999] bg-[#F5F5F7] dark:bg-black flex flex-col items-center justify-center space-y-4 cursor-grab active:cursor-grabbing"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ right: 0.5 }}
                        onDragEnd={(e, info) => {
                            if (info.offset.x > 100 || info.velocity.x > 200) {
                                onClose(); // Trigger app close/back
                            }
                        }}
                    >
                        {/* Swipe Hint - Left Edge */}
                        <div className="absolute left-0 top-0 bottom-0 w-12 z-[10000]" />

                        <motion.div
                            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="w-20 h-20 bg-red-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-500/30"
                        >
                            <span className="text-4xl text-white font-bold">♫</span>
                        </motion.div>
                        <span className="text-xs text-gray-400 font-medium tracking-widest">LOADING</span>
                        <span className="absolute bottom-10 py-1 px-3 rounded-full bg-gray-200/50 dark:bg-white/10 text-[10px] text-gray-400">右滑退出</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <IOSPage
                className="select-none"
                style={{ backgroundColor: '#F5F5F7' }} // Light gray default
                onClose={onClose}
                onBack={isRoot ? onClose : popPage} // Restore Swipe-to-Back/Close
                hasHeader={false} // Fullscreen
            >
                <div className="h-full bg-[#F5F5F7] dark:bg-black flex flex-col relative overflow-hidden text-gray-900 dark:text-white font-sans">
                    {!profile ? (
                        <LoginPage onLoginSuccess={handleLoginSuccess} />
                    ) : (
                        <>
                            {/* Page Stack Rendering */}
                            <div className="relative flex-1 w-full h-full overflow-hidden">
                                <AnimatePresence initial={false}>
                                    {pageStack.map((page, index) => (
                                        <motion.div
                                            key={page.id}
                                            className="absolute inset-0 w-full h-full bg-[#F5F5F7] dark:bg-black shadow-2xl"
                                            style={{ zIndex: index }}
                                            initial={index === 0 ? false : { x: '100%' }}
                                            animate={{ x: 0 }}
                                            exit={{ x: '100%', zIndex: index + 1 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                                        >
                                            {renderPage(page, index)}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Floating Bottom Tab Bar (Only on Root) */}
                            {isRoot && (
                                <div className="absolute bottom-8 left-16 right-16 h-[56px] bg-white/5 dark:bg-white/5 backdrop-blur-2xl rounded-full flex items-center justify-around px-2 z-30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                    <button
                                        onClick={() => setRootTab('discovery')}
                                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-full active:scale-90 transition-all ${rootTab === 'discovery' ? 'text-white bg-white/10' : 'text-[#888888] hover:text-white/50'}`}
                                    >
                                        <Compass size={rootTab === 'discovery' ? 24 : 22} />
                                    </button>
                                    <button
                                        onClick={() => setRootTab('playlists')}
                                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-full active:scale-90 transition-all ${rootTab === 'playlists' ? 'text-white bg-white/10' : 'text-[#888888] hover:text-white/50'}`}
                                    >
                                        <Library size={rootTab === 'playlists' ? 24 : 22} />
                                    </button>
                                </div>
                            )}

                            {/* Mini Player */}
                            <MiniPlayer
                                track={currentTrack}
                                isPlaying={isPlaying}
                                progress={progress}
                                duration={duration}
                                onToggle={(e) => { if (e && e.stopPropagation) e.stopPropagation(); togglePlay(); }}
                                onNext={playNextTrack}
                                onClick={() => setShowPlayer(true)}
                                isWithTabs={isRoot}
                            />

                            {/* Floating Search Header (Discovery Only - Root) */}
                            {isRoot && rootTab === 'discovery' && (
                                <div
                                    className="absolute left-0 right-0 z-40 px-4 py-2 pointer-events-none"
                                    style={{ top: 'calc(env(safe-area-inset-top) + 7px)' }}
                                >
                                    <div
                                        onClick={handleSearchOpen}
                                        className="pointer-events-auto flex items-center space-x-2 bg-white/80 dark:bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-full active:scale-95 transition-transform border border-black/5 dark:border-white/5 shadow-sm"
                                    >
                                        <Search size={16} className="text-gray-500 dark:text-white/40 ml-1" />
                                        <span className="text-sm text-gray-500 dark:text-white/40 font-medium">搜索歌曲...</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </IOSPage>

            <ToastComponent />

            {/* Full Screen Player Overlay - EXPLICIT HIGH Z-INDEX WRAPPER */}
            <div className="relative z-[99999]">
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
                            onOpenQueue={() => setShowQueue(true)}
                            onIntelligenceMode={handleIntelligenceMode}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Queue & Search Overlays */}
            <AnimatePresence>
                {showQueue && (
                    /* Queue Sheet Implementation */
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQueue(false)}
                            className="fixed inset-0 z-[100000] bg-black/40 backdrop-blur-sm"
                        />
                        <CurrentQueueSheet
                            zIndex={100001} // Pass prop if needed, or rely on parent context. Actually CurrentQueueSheet probably has internal Z-Index. 
                            // Wait, CurrentQueueSheet usually uses a Drawer/Sheet component.
                            // If it's a sheet, we need to ensure IT'S z-index is high. 
                            // Let's assume the wrapper 'fixed inset-0' handles the overlay.
                            // But the Sheet itself needs to be above this overlay.
                            // I will check if CurrentQueueSheet accepts className or style.
                            // For now, let's bump the overlay wrapper z-index first.
                            queue={queue}
                            currentIndex={currentIndex}
                            onPlayIndex={(idx) => {
                                const song = queue[idx];
                                if (song) handlePlaySong(song, [], false);
                            }}
                            onClear={() => setShowQueue(false)}
                            onClose={() => setShowQueue(false)}
                        />
                    </>
                )}
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

// --- Sub-components ---

const MiniPlayer = ({ track, isPlaying, progress, duration, onToggle, onNext, onClick, isWithTabs }) => {
    if (!track) return null;
    const percent = duration > 0 ? (progress / duration) * 100 : 0;

    return (
        <div
            className={`absolute left-6 right-6 h-[64px] bg-black/30 dark:bg-black/30 backdrop-blur-2xl saturate-150 rounded-[32px] flex items-center pl-2 pr-4 justify-between z-30 shadow-[0_8px_32px_rgba(0,0,0,0.2)] animate-in fade-in slide-in-from-bottom-4 active:scale-[0.98] transition-all duration-300 border border-white/10 ring-1 ring-white/5 ${isWithTabs ? 'bottom-[90px]' : 'bottom-8'}`}
            onClick={(e) => {
                // Prevent click when clicking controls
                if (e.target.closest('button')) return;
                onClick();
            }}
        >
            {/* Spinning Art */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 animate-spin-slow bg-black/50 ring-2 ring-white/10" style={{ animationPlayState: isPlaying ? 'running' : 'paused', animationDuration: '8s' }}>
                <div className="absolute inset-0 bg-[url('https://s3.music.126.net/mobile-new/img/disc.png')] bg-cover bg-center opacity-100" />
                <img src={track.al?.picUrl} className="absolute inset-[18%] w-[64%] h-[64%] rounded-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 mx-3 flex flex-col justify-center">
                <span className="text-[14px] font-bold text-white truncate">{track.name}</span>
                <span className="text-[11px] text-white/50 truncate">{track.ar?.[0]?.name} - {track.al?.name}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-3">
                <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black active:scale-90 transition-transform shadow-lg shadow-white/10">
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
                {onNext && (
                    <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-white/80 active:scale-90 transition-transform active:text-white">
                        <SkipForward size={24} fill="currentColor" />
                    </button>
                )}
            </div>

            {/* Progress Bar (Bottom Line) */}
            <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-white/10 rounded-full overflow-hidden">
                <div className="absolute inset-0 h-full bg-white/80 rounded-full" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
};

export default MusicApp;
