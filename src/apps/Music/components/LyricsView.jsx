import React, { useState, useEffect, useRef } from 'react';
import { MusicService } from '../../../services/MusicService';
import { motion } from 'framer-motion';

const LyricsView = ({ songId, currentTime, duration }) => {
    const [lyrics, setLyrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [userScrolling, setUserScrolling] = useState(false);
    const scrollTimeout = useRef(null);

    useEffect(() => {
        loadLyric();
    }, [songId]);

    const loadLyric = async () => {
        setLoading(true);
        try {
            const res = await MusicService.getNewLyric(songId); // Try new lyric API first
            const lrc = res?.lrc?.lyric || "";
            const yrc = res?.yrc?.lyric || ""; // New逐字歌词 (Not parsed yet, just placeholder logic)

            // Simple LRC parser
            const parsed = parseLrc(lrc);
            setLyrics(parsed);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const parseLrc = (lrcText) => {
        if (!lrcText) return [{ time: 0, text: "纯音乐，请欣赏" }];
        const lines = lrcText.split('\n');
        const result = [];
        const timeExp = /\[(\d{2}):(\d{2})(\.\d{2,3})?\]/;

        for (const line of lines) {
            const match = timeExp.exec(line);
            if (match && line.trim()) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = match[3] ? parseFloat(match[3]) * 1000 : 0;
                const time = min * 60 + sec + ms / 1000;
                const text = line.replace(timeExp, '').trim();
                if (text) result.push({ time, text });
            }
        }
        return result;
    };

    // Find active lyric index
    useEffect(() => {
        if (lyrics.length === 0) return;
        let index = lyrics.findIndex(l => l.time > currentTime);
        if (index === -1) index = lyrics.length;
        setActiveIndex(index - 1);
    }, [currentTime, lyrics]);

    // Auto Scroll
    useEffect(() => {
        if (userScrolling || activeIndex < 0 || !scrollRef.current) return;

        const activeEl = scrollRef.current.children[activeIndex];
        if (activeEl) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeIndex, userScrolling]);

    const handleScroll = () => {
        setUserScrolling(true);
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => setUserScrolling(false), 2000);
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
            {loading ? (
                <div className="text-white/50 text-sm">加载歌词中...</div>
            ) : lyrics.length === 0 ? (
                <div className="text-white/50 text-sm">暂无歌词</div>
            ) : (
                <div
                    ref={scrollRef}
                    className="w-full h-[60vh] overflow-y-auto no-scrollbar px-6 space-y-6 text-center"
                    onScroll={handleScroll}
                >
                    {/* Padding top/bottom for centering */}
                    <div className="h-[25vh]" />
                    {lyrics.map((line, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: i === activeIndex ? 1.05 : 1,
                                opacity: i === activeIndex ? 1 : 0.3,
                                color: i === activeIndex ? '#fff' : '#aaa'
                            }}
                            className={`transition-all duration-300 ${i === activeIndex ? 'font-bold text-lg drop-shadow-md' : 'text-sm'}`}
                        >
                            {line.text}
                        </motion.div>
                    ))}
                    <div className="h-[25vh]" />
                </div>
            )}
        </div>
    );
};

export default LyricsView;
