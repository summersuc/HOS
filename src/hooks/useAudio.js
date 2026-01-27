import { useState, useEffect, useRef } from 'react';
import { MusicService } from '../services/MusicService';

// GLOBAL SINGLETON AUDIO STATE
// This ensures that even if the component unmounts, the underlying audio object and state persist.
// In a real OS environment, this would be a system service.
export const globalAudio = new Audio();

// --- Persistence Helper ---
const STORAGE_KEY = 'hos_music_state';
const loadState = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...parsed,
                isPlaying: false, // Never auto-play on reload
            };
        }
    } catch (e) {
        console.error("Failed to load music state", e);
    }
    return null;
};

const savedState = loadState();

const globalState = savedState || {
    isPlaying: false,
    progress: 0,
    duration: 0,
    playlist: [], // Context list
    queue: [],    // Actual play queue
    currentIndex: -1,
    currentTrack: null,
    mode: 'sequence',
    history: []
};

// If we have a saved track, try to restore src (but don't play)
// Note: We might need to refresh the URL if it expires, but for now assume it helps.
// Actually, Netease URLs expire. So reusing the URL might fail.
// Strategy: Restore track info, but NOT the src. When user clicks play, 'playTrack' logic runs.
// But 'playTrack' takes a URL.
// We need a way to 'resume' which re-fetches URL if needed.
// For now, let's NOT set globalAudio.src. Wait for user interaction.
// But the UI needs to show the track.

// Event verification to prevent multi-binding
let isGlobalListenerAttached = false;
const listeners = new Set(); // Set of setStates to update

const saveState = () => {
    try {
        const { isPlaying, ...stateToSave } = globalState;
        // Don't save large history if not needed, but queue is important
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
        // Quantal error or quota
    }
};

const broadcastState = () => {
    listeners.forEach(setState => setState({ ...globalState }));
    saveState();
};

// Helper for Fisher-Yates shuffle
const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// Auto-next function (Now global)
const autoPlayNext = async () => {
    if (globalState.queue.length === 0) return;

    let nextIndex = globalState.currentIndex + 1;
    if (nextIndex >= globalState.queue.length) {
        if (globalState.mode === 'sequence') {
            globalState.isPlaying = false;
            broadcastState();
            return;
        }
        nextIndex = 0; // Wrap around for loop/shuffle
    }

    const nextTrack = globalState.queue[nextIndex];
    if (nextTrack) {
        try {
            const res = await MusicService.getSongUrl(nextTrack.id);
            if (res?.data?.[0]?.url) {
                // We handle playTrack logic manually here or call it if available
                // To keep it simple, we use the global audio directly for auto-next
                globalState.currentIndex = nextIndex;
                globalState.currentTrack = nextTrack;
                globalAudio.src = res.data[0].url;
                await globalAudio.play();
                globalState.isPlaying = true;
                broadcastState();
            }
        } catch (e) {
            console.error("Auto-play next failed", e);
        }
    }
};

// Bind Events to Global Audio Once
if (!isGlobalListenerAttached) {
    globalAudio.addEventListener('timeupdate', () => {
        globalState.progress = globalAudio.currentTime;
        broadcastState();
    });
    globalAudio.addEventListener('loadedmetadata', () => {
        globalState.duration = globalAudio.duration;
        broadcastState();
    });
    globalAudio.addEventListener('ended', () => {
        if (globalState.mode === 'loop') {
            globalAudio.currentTime = 0;
            globalAudio.play();
        } else {
            autoPlayNext(); // Directly call the global function
        }
        broadcastState();
    });
    globalAudio.addEventListener('play', () => {
        globalState.isPlaying = true;
        broadcastState();
    });
    globalAudio.addEventListener('pause', () => {
        globalState.isPlaying = false;
        broadcastState();
    });
    isGlobalListenerAttached = true;
}

export const useAudio = () => {
    // Local state syncing with global
    const [state, setState] = useState({ ...globalState });

    const toggleMode = () => {
        const modes = ['sequence', 'loop', 'shuffle'];
        const nextMode = modes[(modes.indexOf(globalState.mode) + 1) % modes.length];

        if (nextMode === 'shuffle') {
            // Use real shuffle
            const newQueue = shuffleArray(globalState.playlist);
            if (globalState.currentTrack) {
                const idx = newQueue.findIndex(t => t.id === globalState.currentTrack.id);
                if (idx > -1) {
                    newQueue.splice(idx, 1);
                    newQueue.unshift(globalState.currentTrack);
                }
            }
            globalState.queue = newQueue;
            globalState.currentIndex = 0;
        } else {
            globalState.queue = globalState.playlist;
            if (globalState.currentTrack) {
                globalState.currentIndex = globalState.playlist.findIndex(t => t.id === globalState.currentTrack.id);
            }
        }
        globalState.mode = nextMode;
        broadcastState();
    };

    useEffect(() => {
        listeners.add(setState);
        // Initial sync
        setState({ ...globalState });

        return () => {
            listeners.delete(setState);
        };
    }, []);

    const playTrack = async (track, url, list = []) => {
        if (!url) return;

        if (list.length > 0) {
            globalState.playlist = list;
            if (globalState.mode === 'shuffle') {
                const newQueue = shuffleArray(list);
                const idx = newQueue.findIndex(t => t.id === track.id);
                if (idx > -1) newQueue.splice(idx, 1);
                newQueue.unshift(track);
                globalState.queue = newQueue;
                globalState.currentIndex = 0;
            } else {
                globalState.queue = list;
                globalState.currentIndex = list.findIndex(t => t.id === track.id);
            }
            globalState.history = [];
        } else {
            // 单曲播放：尝试在现有队列中查找并更新索引
            const existingIdx = globalState.queue.findIndex(t => t.id === track.id);
            if (existingIdx > -1) {
                globalState.currentIndex = existingIdx;
            }
        }

        // --- Optimistic UI Update: Update State IMMEDIATELY before loading audio ---
        globalState.currentTrack = track;
        globalState.isPlaying = true; // Assume success first for instant toggle
        broadcastState(); // Force UI update NOW

        try {
            // Prevent reload if same source?
            if (globalAudio.src !== url) {
                globalAudio.src = url;
            }

            await globalAudio.play();
            // globalState.isPlaying = true; // Already set
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Playback failed:", error);
                globalState.isPlaying = false;
            }
        }
        broadcastState();
    };

    const playNext = async () => {
        if (globalState.queue.length === 0) return;

        let nextIndex = globalState.currentIndex + 1;
        if (nextIndex >= globalState.queue.length) {
            nextIndex = 0;
        }

        const nextTrack = globalState.queue[nextIndex];
        if (nextTrack) {
            try {
                const res = await MusicService.getSongUrl(nextTrack.id);
                if (res?.data?.[0]?.url) {
                    playTrack(nextTrack, res.data[0].url);
                }
            } catch (e) {
                console.error("Play next failed", e);
            }
        }
    };

    const playPrev = async () => {
        if (globalState.queue.length === 0) return;

        let prevIndex = globalState.currentIndex - 1;
        if (prevIndex < 0) prevIndex = globalState.queue.length - 1;

        const prevTrack = globalState.queue[prevIndex];
        if (prevTrack) {
            try {
                const res = await MusicService.getSongUrl(prevTrack.id);
                if (res?.data?.[0]?.url) {
                    playTrack(prevTrack, res.data[0].url);
                }
            } catch (e) {
                console.error("Play prev failed", e);
            }
        }
    };

    const togglePlay = async () => {
        try {
            if (globalState.isPlaying) {
                globalAudio.pause();
            } else {
                if (!globalAudio.src && globalState.currentTrack) {
                    // Try to restore source if missing
                    const res = await MusicService.getSongUrl(globalState.currentTrack.id);
                    if (res?.data?.[0]?.url) {
                        globalAudio.src = res.data[0].url;
                    }
                }
                await globalAudio.play();
            }
        } catch (e) {
            console.error("Toggle play failed", e);
            // Sync state if actual play failed
            globalState.isPlaying = false;
            broadcastState();
        }
    };

    const seek = (time) => {
        globalAudio.currentTime = time;
        globalState.progress = time;
        broadcastState();
    };

    return {
        audio: globalAudio,
        isPlaying: state.isPlaying,
        progress: state.progress,
        duration: state.duration,
        currentTrack: state.currentTrack,
        currentIndex: state.currentIndex,
        mode: state.mode,
        queue: state.queue,
        toggleMode,
        playTrack,
        togglePlay,
        seek,
        playNextTrack: playNext,
        playPrevTrack: playPrev
    };
};
