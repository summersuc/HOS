import React, { useState, useEffect } from 'react';
import { Play, Pause, Disc, ListMusic } from 'lucide-react';
import { useAudio } from '../../../hooks/useAudio';
import { MusicService } from '../../../services/MusicService';

const MusicBubble = ({ content, metadata, isUser }) => {
    // metadata: { songId, title, artist, cover, url, type: 'song'|'playlist', trackCount }
    // type default to 'song'

    const { currentTrack, isPlaying, playTrack, togglePlay } = useAudio();
    const [loading, setLoading] = useState(false);

    // Check if this specific song/playlist is currently active
    const isCurrent = React.useMemo(() => {
        if (!currentTrack) return false;
        if (metadata.type === 'playlist') {
            // Hard to know if *this* specific playlist object initiated the queue, 
            // but we can check if currentTrack is inside it? 
            // For now, simpler: if we just clicked play on this playlist, we might want to show active.
            // But let's keep it simple: Card is "active" if currentTrack.id matches metadata.songId (if song)
            return false; // Playlist card usually just triggers, doesn't stay "playing" itself visually in same way
        }
        return String(currentTrack.id) === String(metadata.songId);
    }, [currentTrack, metadata]);

    const isActualPlaying = isCurrent && isPlaying;

    const handlePlay = async (e) => {
        e.stopPropagation();

        if (isCurrent) {
            togglePlay();
            return;
        }

        setLoading(true);
        try {
            if (metadata.type === 'playlist') {
                // Play Playlist
                const res = await MusicService.getPlaylistDetail(metadata.songId);
                let tracks = [];
                if (res.playlist && res.playlist.tracks) tracks = res.playlist.tracks;
                else if (res.songs) tracks = res.songs;

                if (tracks.length > 0) {
                    // Get URL for first song
                    const first = tracks[0];
                    const urlRes = await MusicService.getSongUrl(first.id);
                    const url = urlRes?.data?.[0]?.url;
                    if (url) {
                        await playTrack(first, url, tracks);
                    }
                }
            } else {
                // Play Single Song
                // Check if we have URL in metadata (unlikely to be fresh) or fetch new
                const res = await MusicService.getSongUrl(metadata.songId);
                const url = res?.data?.[0]?.url;
                if (url) {
                    // Construct track object from metadata if needed, but ideally we fetch detail
                    // But metadata usually has basic info.
                    // Let's rely on metadata for instant UI, but maybe fetch detail?
                    // actually playTrack expects a full track object usually for UI (al, ar).
                    // Let's reconstruct a minimal track object
                    const trackObj = {
                        id: metadata.songId,
                        name: metadata.title,
                        ar: [{ name: metadata.artist }],
                        al: { picUrl: metadata.cover }
                    };
                    await playTrack(trackObj, url, []); // Single song play
                }
            }
        } catch (err) {
            console.error("Play failed", err);
        } finally {
            setLoading(false);
        }
    };

    if (metadata.type === 'playlist') {
        return (
            <div
                onClick={handlePlay}
                className={`relative overflow-hidden rounded-2xl w-72 p-0 cursor-pointer transition-all active:scale-95 group shadow-lg ${isUser ? 'bg-gradient-to-br from-[#FF2D55] to-[#FF375F]' : 'bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10'}`}
            >
                {/* Blurry Backdrop */}
                <div className="absolute inset-0">
                    <img src={metadata.cover} className="w-full h-full object-cover opacity-20 blur-xl scale-150" />
                    <div className={`absolute inset-0 ${isUser ? 'bg-gradient-to-br from-[#FF2D55]/90 to-[#FF375F]/90' : 'bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl'}`} />
                </div>

                <div className="relative p-4 flex items-center gap-4 z-10">
                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-black/20 shadow-lg group-hover:scale-105 transition-transform duration-500">
                        <img src={metadata.cover} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <ListMusic size={28} className="text-white drop-shadow-md" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className={`text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5 ${isUser ? 'text-white/90' : 'text-red-500'}`}>Playlist</span>
                        <h4 className={`text-[15px] font-bold truncate leading-tight mb-0.5 ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{metadata.title}</h4>
                        <span className={`text-xs truncate opacity-70 font-medium ${isUser ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            {metadata.trackCount ? `${metadata.trackCount} Tracks` : 'Collection'}
                        </span>
                    </div>

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xl transition-all ${isUser ? 'bg-white text-[#FF2D55]' : 'bg-[#FF2D55] text-white group-hover:bg-[#FF375F]'}`}>
                        {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            onClick={handlePlay}
            className={`relative overflow-hidden rounded-[20px] w-72 p-0 flex items-center shadow-lg transition-transform active:scale-95 cursor-pointer group ${isUser ? 'bg-[#007AFF]' : 'bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10'}`}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Only show subtle blur for non-user or different style? Let's keep clean for user. */}
                {/* Actually, user bubble is blue. Let's add a subtle gradient sheen. */}
                {isUser && <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />}
            </div>

            <div className="relative p-3 pl-3 flex items-center gap-3 w-full z-10">
                {/* Vinyl UI */}
                <div className={`relative w-[52px] h-[52px] shrink-0 rounded-full bg-[#111] flex items-center justify-center overflow-hidden ring-4 ${isUser ? 'ring-white/20' : 'ring-gray-100 dark:ring-white/5'} shadow-lg`}>
                    <div
                        className="absolute inset-0 bg-[url('https://s3.music.126.net/mobile-new/img/disc.png')] bg-cover bg-center opacity-90"
                        style={{
                            animation: isActualPlaying ? 'spin 4s linear infinite' : 'none',
                            transform: isActualPlaying ? 'none' : 'rotate(0deg)'
                        }}
                    />
                    <div className="absolute inset-[22%] rounded-full overflow-hidden">
                        <img src={metadata.cover} className="w-full h-full object-cover" style={{ animation: isActualPlaying ? 'spin 4s linear infinite' : 'none' }} />
                    </div>
                    {!isActualPlaying && <div className="absolute inset-0 bg-black/20" />}
                    {/* Center Dot */}
                    <div className="absolute w-1.5 h-1.5 bg-black rounded-full border border-gray-700" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                    <h4 className={`text-[15px] font-bold truncate leading-tight ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{metadata.title}</h4>
                    <span className={`text-[12px] truncate opacity-80 ${isUser ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{metadata.artist}</span>
                </div>

                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${isUser ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        isActualPlaying ? (
                            <div className="flex gap-[2px] items-end h-3">
                                <span className="w-[2px] bg-current animate-music-bar-1" />
                                <span className="w-[2px] bg-current animate-music-bar-2" />
                                <span className="w-[2px] bg-current animate-music-bar-3" />
                            </div>
                        ) : <Play size={18} fill="currentColor" className="ml-0.5" />
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes music-bar { 0%, 100% { height: 4px; } 50% { height: 12px; } }
                .animate-music-bar-1 { animation: music-bar 0.6s ease-in-out infinite; }
                .animate-music-bar-2 { animation: music-bar 0.6s ease-in-out infinite 0.1s; }
                .animate-music-bar-3 { animation: music-bar 0.6s ease-in-out infinite 0.2s; }
            `}</style>
        </div>
    );
};

export default MusicBubble;
