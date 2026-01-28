import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { motion, useMotionValue, useDragControls, useAnimation } from 'framer-motion';
import { MusicService } from '../../../services/MusicService';

const SEARCH_TABS = [
    { name: '单曲', type: 1 },
    { name: '歌单', type: 1000 },
    { name: '播客', type: 1009 },
    { name: '专辑', type: 10 },
    { name: '歌手', type: 100 },
    { name: 'MV', type: 1004 },
    { name: '用户', type: 1002 },
];

/**
 * SearchOverlay - Top-level search with independent swipe-back gesture
 */
const SearchOverlay = ({
    searchQuery, setSearchQuery,
    searchResults, searchType, setSearchType,
    loading, loadingMore, error, hasMore,
    onSearch, onLoadMore, onClose,
    onPlaySong, onSelectPlaylist
}) => {
    const x = useMotionValue(0);
    const dragControls = useDragControls();
    const controls = useAnimation();

    const [hotList, setHotList] = useState([]);
    const [defaultKeyword, setDefaultKeyword] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const suggestRef = useRef(null);

    useEffect(() => {
        loadHotSearch();

        const handleClickOutside = (event) => {
            if (suggestRef.current && !suggestRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Debounce suggestion fetch
        const timer = setTimeout(() => {
            loadSuggestions(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadHotSearch = async () => {
        try {
            const [hotRes, defaultRes] = await Promise.all([
                MusicService.searchHot(),
                MusicService.searchDefault()
            ]);
            if (hotRes?.data) {
                // 过滤掉已知的失效 404 图片 (如 4.jpg)
                const cleanedHotList = hotRes.data.map(item => ({
                    ...item,
                    iconUrl: (item.iconUrl && item.iconUrl.includes('4.jpg')) ? null : item.iconUrl
                }));
                setHotList(cleanedHotList);
            }
            if (defaultRes?.data?.showKeyword) setDefaultKeyword(defaultRes.data.showKeyword);
        } catch (e) {
            console.error("Hot search load failed", e);
        }
    };

    const loadSuggestions = async (kw) => {
        try {
            const res = await MusicService.searchSuggest(kw);
            if (res?.result?.allMatch) {
                setSuggestions(res.result.allMatch);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        } catch (e) {
            // silent fail
        }
    };



    const handleHotClick = (keyword) => {
        setSearchQuery(keyword);
        setShowSuggestions(false);
        onSearch(searchType, false, keyword);
    };

    // Wrapper for search submit
    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        const q = searchQuery || defaultKeyword;
        if (!q) return;
        setSearchQuery(q);
        setShowSuggestions(false); // Hide suggest on search
        onSearch(searchType, false, q);
    };

    const handleTabChange = (type) => {
        setSearchType(type);
        setShowSuggestions(false);
        onSearch(type, false, searchQuery || defaultKeyword);
    };

    const handleDragEnd = async (event, info) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (offset > 80 || velocity > 300) {
            await controls.start({
                x: "100%",
                transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] }
            });
            onClose();
        } else {
            controls.start({
                x: 0,
                transition: { type: "spring", stiffness: 400, damping: 40 }
            });
        }
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.8 }}
            className="absolute inset-0 z-40 flex flex-col bg-[#f2f2f7] dark:bg-black"
            style={{ x, willChange: "transform" }}

            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.5 }}
            onDragEnd={handleDragEnd}
            dragListener={false}
            dragControls={dragControls}
        >
            {/* Edge Swipe Hit Area */}
            <div
                className="absolute left-0 top-0 bottom-0 w-10 z-50 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: 'none' }}
            />

            {/* Search Header */}
            <div
                ref={suggestRef}
                className="px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-2 bg-white dark:bg-black/80 backdrop-blur-md sticky top-0 z-[60]"
            >
                <div className="flex items-center space-x-2 mb-3 bg-gray-100 dark:bg-white/10 p-2 rounded-xl">
                    <Search size={18} className="text-gray-400 ml-1" />
                    <form onSubmit={handleSubmit} className="flex-1">
                        <input
                            autoFocus
                            type="text"
                            value={searchQuery}
                            onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={defaultKeyword || "搜索..."}
                            className="bg-transparent w-full outline-none text-sm dark:text-white"
                        />
                    </form>
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        className="text-xs text-blue-500 font-bold px-2 py-1"
                    >
                        搜索
                    </button>
                </div>

                {/* Search Tabs */}
                <div className="flex overflow-x-auto no-scrollbar space-x-6 px-1 pb-1">
                    {SEARCH_TABS.map(tab => (
                        <button
                            key={tab.type}
                            onClick={() => handleTabChange(tab.type)}
                            className={`flex-shrink-0 text-sm font-medium pb-2 border-b-2 transition-all ${searchType === tab.type
                                ? 'text-red-500 border-red-500 font-bold'
                                : 'text-gray-500 border-transparent'
                                }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results List or Hot/Suggest */}
            <div
                onScroll={() => setShowSuggestions(false)}
                className="flex-1 overflow-y-auto pb-32 pt-2 px-4 space-y-2 relative"
            >

                {/* Suggestions Dropdown (Overlay or inline?) */}
                {showSuggestions && suggestions.length > 0 && searchQuery && (
                    <div className="absolute top-0 left-4 right-4 bg-white dark:bg-[#1C1C1E] rounded-xl shadow-xl z-20 overflow-hidden border border-gray-100 dark:border-white/10">
                        {suggestions.map((s, i) => (
                            <div
                                key={i}
                                onClick={() => {
                                    setSearchQuery(s.keyword);
                                    setShowSuggestions(false);
                                    onSearch(searchType, false, s.keyword);
                                }}
                                className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                            >
                                <Search size={14} className="mr-3 text-gray-400" />
                                <span className="text-sm text-gray-700 dark:text-gray-200">{s.keyword}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Hot Search Section (Show only when no query and no results) */}
                {!searchQuery && searchResults.length === 0 && (
                    <div className="mt-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 px-1">热搜榜</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {hotList.map((item, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        setSearchQuery(item.searchWord);
                                        setShowSuggestions(false);
                                        onSearch(searchType, false, item.searchWord);
                                    }}
                                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                >
                                    <span className={`text-sm font-bold w-4 text-center ${index < 3 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center">
                                            <span className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">
                                                {item.searchWord}
                                            </span>
                                            {item.iconUrl && (
                                                <img
                                                    src={item.iconUrl}
                                                    className="h-3 ml-2 object-contain"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate">
                                            {item.content || item.score}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-10 opacity-50 text-sm">正在搜索...</div>
                )}

                {/* Error State */}
                {error && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <p className="text-sm text-gray-500">{error}</p>
                        <button
                            onClick={() => onSearch(searchType, false, searchQuery)}
                            className="px-4 py-1.5 bg-red-500 text-white rounded-full text-xs font-bold shadow-lg shadow-red-500/20"
                        >
                            重试
                        </button>
                    </div>
                )}

                {/* No Results Info */}
                {!loading && !error && searchResults.length === 0 && searchQuery && !showSuggestions && (
                    <div className="flex justify-center py-10 opacity-50 text-sm">暂无搜索结果</div>
                )}

                {/* Actual Results */}
                {searchResults.map((item, index) => {
                    // 更健壮的类型识别逻辑 (兼容综合搜索和单一类型搜索)
                    const isSong = !!(item.al || item.ar || item.dt || (item.artists && item.album));
                    const isPlaylist = !!(item.trackCount !== undefined || item.playCount !== undefined || item.coverImgUrl);
                    const isArtist = !!(item.img1v1Url || item.artistName === undefined && item.musicSize !== undefined);
                    const isMV = !!(item.cover && (item.artistName || item.duration));
                    const isUser = !!(item.nickname && item.userType !== undefined);

                    const imageUrl = item.al?.picUrl || item.coverImgUrl || item.picUrl || item.img1v1Url || item.cover || item.avatarUrl;
                    const mainTitle = item.name || item.title || item.nickname;

                    let subTitle = "";
                    if (isSong) subTitle = `${item.ar?.[0]?.name || item.artists?.[0]?.name || "未知歌手"} · ${item.al?.name || item.album?.name || ""}`;
                    else if (isPlaylist) subTitle = `歌单 · ${item.trackCount || 0}首 · ${item.creator?.nickname || ""}`;
                    else if (isArtist) subTitle = "歌手";
                    else if (isMV) subTitle = `MV · ${item.artistName}`;
                    else if (isUser) subTitle = `用户 · ${item.signature || ""}`;
                    else subTitle = item.artist?.name || "";

                    return (
                        <div
                            key={`${item.id}-${searchType}-${index}`}
                            onClick={() => {
                                if (isSong) {
                                    onPlaySong(item, searchResults);
                                } else if (isPlaylist || searchType === 1000) {
                                    // 确保 Playlist 点击生效
                                    if (onSelectPlaylist && item.id) {
                                        onSelectPlaylist(item.id, item);
                                    }
                                }
                            }}
                            className="flex items-center p-2 rounded-xl active:bg-gray-200 dark:active:bg-white/10 transition-colors cursor-pointer"
                        >
                            <div className={`w-12 h-12 overflow-hidden mr-3 bg-gray-200 flex-shrink-0 ${isArtist ? 'rounded-full' : 'rounded-lg'}`}>
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.classList.add('flex', 'items-center', 'justify-center');
                                        e.target.parentElement.innerHTML = '<span class="text-xs text-gray-400">♫</span>';
                                    }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold dark:text-white truncate">{mainTitle}</h4>
                                <p className="text-xs text-gray-500 truncate mt-1">
                                    {subTitle}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {searchResults.length > 0 && hasMore && (
                    <div className="flex justify-center py-6">
                        <button
                            onClick={() => onLoadMore()}
                            disabled={loadingMore}
                            className="px-6 py-2 bg-gray-200 dark:bg-white/10 rounded-full text-xs font-bold text-gray-600 dark:text-gray-400 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {loadingMore ? "加载中..." : "加载更多"}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default SearchOverlay;
