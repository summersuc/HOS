import React, { useState, useEffect } from 'react';
import { MusicService } from '../../../services/MusicService';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, MoreVertical, Search, Shuffle } from 'lucide-react';

const SongListView = ({ playlistId, onBack, onPlaySong }) => {
    const [songs, setSongs] = useState([]);
    const [info, setInfo] = useState(null);

    useEffect(() => {
        // Fetch Playlist Header Info & Songs
        MusicService.getPlaylistDetail(playlistId).then(res => {
            if (res?.playlist) {
                setInfo(res.playlist);
                if (res.playlist.tracks) setSongs(res.playlist.tracks);
            } else if (res?.songs) {
                setSongs(res.songs); // Fallback if regular song endpoint used
            }
        });
    }, [playlistId]);

    const handlePlayAll = () => {
        if (songs.length > 0) {
            onPlaySong(songs[0], songs);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#121212]">
            {/* Header (Transparent/Blur) */}
            <div className="sticky top-0 z-30 px-4 py-3 flex items-center space-x-4 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                <button onClick={onBack} className="p-1 -ml-1 active:opacity-50">
                    <ArrowLeft size={22} className="text-gray-900 dark:text-white" />
                </button>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold truncate text-gray-900 dark:text-white">
                        {info ? info.name : 'Loading...'}
                    </h3>
                </div>
                <button className="p-1">
                    <Search size={20} className="text-gray-900 dark:text-white" />
                </button>
                <button className="p-1">
                    <MoreVertical size={20} className="text-gray-900 dark:text-white" />
                </button>
            </div>

            {/* List Header Actions */}
            <div className="px-4 py-2 bg-white dark:bg-[#121212] sticky top-[53px] z-20">
                <div
                    onClick={handlePlayAll}
                    className="flex items-center space-x-3 cursor-pointer active:opacity-60"
                >
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                        <Play fill="currentColor" size={18} className="translate-x-0.5" />
                    </div>
                    <div className="flex-1">
                        <div className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                            播放全部 <span className="text-xs font-normal text-gray-500 ml-1">({songs.length})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pb-32 pt-2">
                {songs.map((song, i) => (
                    <motion.div
                        key={song.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.01 + 0.1 }} // Stagger
                        onClick={() => onPlaySong(song, songs)} // Pass song and list context
                        className="flex items-center px-4 py-3 space-x-4 active:bg-gray-100 dark:active:bg-white/5 cursor-pointer"
                    >
                        <span className="text-sm font-medium text-gray-400 w-6 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">
                                {song.name}
                            </p>
                            <div className="flex items-center mt-1">
                                {/* Quality Tags? */}
                                <p className="text-xs text-gray-500 truncate">
                                    {song.ar?.map(a => a.name).join(' / ')} - {song.al?.name}
                                </p>
                            </div>
                        </div>
                        <button className="text-gray-300 dark:text-gray-600 p-2">
                            <MoreVertical size={18} />
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default SongListView;
