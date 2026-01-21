import { useState, useEffect, useRef } from 'react';

// GLOBAL SINGLETON AUDIO STATE
// This ensures that even if the component unmounts, the underlying audio object and state persist.
// In a real OS environment, this would be a system service.
const globalAudio = new Audio();
const globalState = {
    isPlaying: false,
    progress: 0,
    duration: 0,
    playlist: [],
    queue: [],
    currentIndex: -1,
    currentTrack: null,
    mode: 'sequence',
    history: []
};

// Event verification to prevent multi-binding
let isGlobalListenerAttached = false;
const listeners = new Set(); // Set of setStates to update

const broadcastState = () => {
    listeners.forEach(setState => setState({ ...globalState }));
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

    useEffect(() => {
        listeners.add(setState);
        // Initial sync
        setState({ ...globalState });

        // Listen for custom 'audio-ended' event to trigger next track logic from within the hook
        // This is a bit tricky since multiple components using the hook might trigger it.
        // We should designate one "Master" or just let proper singleton management handle it.
        // For now, let's keep the hook simple: changing track is an action.

        const handleEnded = () => {
            // Logic to play next
            playNext();
        };
        globalAudio.addEventListener('audio-ended', handleEnded);

        return () => {
            listeners.delete(setState);
            globalAudio.removeEventListener('audio-ended', handleEnded);
        };
    }, []);

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
        }

        try {
            // Prevent reload if same source?
            if (globalAudio.src !== url) {
                globalAudio.src = url;
            }
            globalState.currentTrack = track;

            await globalAudio.play();
            globalState.isPlaying = true;
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
