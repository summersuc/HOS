import React from 'react';
import { Search } from 'lucide-react';
import { motion, useMotionValue, useDragControls, useAnimation } from 'framer-motion';

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

    const handleTabChange = (type) => {
        setSearchType(type);
        onSearch(type, false); // searchType changed, reset offset
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
            <div className="px-4 pt-4 pb-2 bg-white dark:bg-black/80 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center space-x-2 mb-3 bg-gray-100 dark:bg-white/10 p-2 rounded-xl">
                    <Search size={18} className="text-gray-500" />
                    <form onSubmit={(e) => { e.preventDefault(); onSearch(searchType, false); }} className="flex-1">
                        <input
                            autoFocus
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索..."
                            className="bg-transparent w-full outline-none text-sm dark:text-white"
                        />
                    </form>
                    <button
                        onClick={() => onSearch(searchType, false)}
                        className="text-xs text-blue-500 font-bold p-1"
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

            {/* Results List */}
            <div className="flex-1 overflow-y-auto pb-32 pt-2 px-4 space-y-2">
                {loading && searchResults.length === 0 && (
                    <div className="flex justify-center py-10 opacity-50 text-sm">正在搜索...</div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <p className="text-sm text-gray-500">{error}</p>
                        <button
                            onClick={() => onSearch(searchType, false)}
                            className="px-4 py-1.5 bg-red-500 text-white rounded-full text-xs font-bold shadow-lg shadow-red-500/20"
                        >
                            重试
                        </button>
                    </div>
                )}

                {!loading && !error && searchResults.length === 0 && searchQuery && (
                    <div className="flex justify-center py-10 opacity-50 text-sm">暂无搜索结果</div>
                )}

                {searchResults.map((item, index) => {
                    const isSong = !!(item.al || item.ar);
                    const isPlaylist = item.trackCount !== undefined && !isSong;
                    const isArtist = !!item.img1v1Url;
                    const isMV = !!item.cover && !!item.artistName;
                    const isDJRes = !!item.dj;

                    const imageUrl = item.al?.picUrl || item.coverImgUrl || item.picUrl || item.img1v1Url || item.cover;
                    const mainTitle = item.name || item.title;
                    const subTitle = isSong
                        ? `${item.ar?.[0]?.name} · ${item.al?.name}`
                        : isPlaylist
                            ? `${item.trackCount} 首歌曲 · ${item.creator?.nickname}`
                            : isArtist
                                ? "歌手"
                                : isMV
                                    ? `MV · ${item.artistName}`
                                    : isDJRes
                                        ? `播客 · ${item.dj?.nickname}`
                                        : item.artist?.name || "";

                    return (
                        <div
                            key={`${item.id}-${searchType}-${index}`}
                            onClick={() => isSong ? onPlaySong(item, searchResults) : isPlaylist ? onSelectPlaylist(item.id) : null}
                            className="flex items-center p-2 rounded-xl active:bg-gray-200 dark:active:bg-white/10 transition-colors cursor-pointer"
                        >
                            <div className={`w-12 h-12 overflow-hidden mr-3 bg-gray-200 flex-shrink-0 ${isArtist ? 'rounded-full' : 'rounded-lg'}`}>
                                <img src={imageUrl} className="w-full h-full object-cover" loading="lazy" />
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
