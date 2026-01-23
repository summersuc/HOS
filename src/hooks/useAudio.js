import { useState, useEffect, useRef } from 'react';

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

// Bind Events to Global Audio Once
if (!isGlobalListenerAttached) {
    globalAudio.addEventListener('timeupdate', () => {
        globalState.progress = globalAudio.currentTime;
        broadcastState(); // layout thrashing? throttle this if performance issues arise
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
            // Auto-next logic handled by hook or service exposed method?
            // Since we can't call hook functions here easily, we rely on the component to detect 'ended' or we build a mini-service.
            // Simplified: Dispatch an event the hook captures.
            globalAudio.dispatchEvent(new CustomEvent('audio-ended'));
        }
        broadcastState();
    });
    globalAudio.addEventListener('play', () => {
        globalState.isPlaying = true;
        broadcastState();
    });
    globalAudio.addEventListener('pause', () => {
        // Only set false if we really meant to pause (sometimes src change triggers pause)
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
            const newQueue = [...globalState.playlist].sort(() => Math.random() - 0.5);
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

        const handleEnded = () => {
            // Logic to play next automatically
            if (globalState.queue.length === 0) return;
            let nextIndex = globalState.currentIndex + 1;
            if (nextIndex >= globalState.queue.length) {
                nextIndex = 0;
            }
            const nextTrack = globalState.queue[nextIndex];
            if (nextTrack) {
                globalAudio.dispatchEvent(new CustomEvent('request-play-next', { detail: nextTrack }));
            }
        };
        globalAudio.addEventListener('audio-ended', handleEnded);

        return () => {
            listeners.delete(setState);
            globalAudio.removeEventListener('audio-ended', handleEnded);
        };
    }, []);

    const playTrack = async (track, url, list = []) => {
        if (!url) return;

        if (list.length > 0) {
            globalState.playlist = list;
            if (globalState.mode === 'shuffle') {
                const newQueue = [...list].sort(() => Math.random() - 0.5);
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

    const playNext = (auto = false) => {
        if (globalState.queue.length === 0) return;

        let nextIndex = globalState.currentIndex + 1;
        if (nextIndex >= globalState.queue.length) {
            nextIndex = 0;
        }

        // Logic update state
        globalState.currentIndex = nextIndex;
        // NOTE: This intentionally does NOT play audio. It assumes the UI controls will pick up the 'currentTrack' change/logic OR calls this to GET the next track.
        // Wait, `playTrack` sets the track. `playNext` here returns the track node?
        // My previous code returned the track.

        return globalState.queue[nextIndex];
    };

    const playPrev = () => {
        let prevIndex = globalState.currentIndex - 1;
        if (prevIndex < 0) prevIndex = globalState.queue.length - 1;
        return globalState.queue[prevIndex];
    };

    const togglePlay = () => {
        if (globalState.isPlaying) globalAudio.pause();
        else globalAudio.play();
        // Listener updates state
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
