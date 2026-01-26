
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { User, Snowflake } from 'lucide-react';
import WidgetBase from '../WidgetBase';
import { storageService } from '../../../services/StorageService';

// --- Helper Hook: Lazy Load Image (Blob or URL) ---
const useImageLoader = (type, payload) => {
    const [src, setSrc] = useState('');

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!payload) {
                if (active) setSrc('');
                return;
            }

            if (type === 'blob') {
                try {
                    const url = await storageService.getBlob('blobs', payload);
                    if (active && url) setSrc(url);
                } catch (e) { console.error("Blob load failed", e); }
            } else {
                if (active) setSrc(payload);
            }
        };
        load();
        return () => { active = false; };
    }, [type, payload]);

    return src;
};


const SnowEffect = ({ active }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const particles = [];

        const resize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.offsetWidth;
                canvas.height = canvas.parentElement.offsetHeight;
            }
        };

        const createParticle = () => {
            return {
                x: Math.random() * canvas.width,
                y: -10,
                radius: Math.random() * 2 + 1,
                speed: Math.random() * 1 + 0.5,
                wind: Math.random() * 0.5 - 0.25,
                alpha: Math.random() * 0.5 + 0.2
            };
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (Math.random() < 0.05) particles.push(createParticle());

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.y += p.speed;
                p.x += p.wind;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.fill();

                if (p.y > canvas.height) {
                    particles.splice(i, 1);
                    i--;
                }
            }
            animationFrameId = requestAnimationFrame(draw);
        };

        resize();
        draw();

        const observer = new ResizeObserver(resize);
        if (canvas.parentElement) observer.observe(canvas.parentElement);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, [active]);

    if (!active) return null;
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50 w-full h-full" />;
};

const AnniversaryWidget = ({ settings }) => {
    const {
        anniversaryId,
        leftAvatarType, leftAvatarPayload,
        rightAvatarType, rightAvatarPayload,
        leftMessage, rightMessage,
        bgColor,
        bgImageType, bgImagePayload,
        showSnow
    } = settings || {};

    // Load Data
    const anniversary = useLiveQuery(
        async () => {
            if (!anniversaryId) return null;
            return await db.anniversaries.get(Number(anniversaryId));
        },
        [anniversaryId]
    );

    // Load Images
    const leftSrc = useImageLoader(leftAvatarType, leftAvatarPayload);
    const rightSrc = useImageLoader(rightAvatarType, rightAvatarPayload);
    const bgSrc = useImageLoader(bgImageType, bgImagePayload);

    const calculateDays = (dateStr, mode) => {
        if (!dateStr) return 0;
        const targetDate = new Date(dateStr.replace(/-/g, '/'));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        if (mode === 'countdown') {
            const thisYear = today.getFullYear();
            let nextOccurrence = new Date(thisYear, targetDate.getMonth(), targetDate.getDate());
            if (nextOccurrence < today) {
                nextOccurrence = new Date(thisYear + 1, targetDate.getMonth(), targetDate.getDate());
            }
            const diffTime = nextOccurrence - today;
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
            const diffTime = today - targetDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 ? diffDays : 0;
        }
    };

    if (!settings || !anniversaryId) {
        return (
            <WidgetBase variant="glass" className="flex flex-col items-center justify-center text-gray-400">
                <span className="text-2xl mb-1">❤️</span>
                <span className="text-xs">未设置纪念日</span>
            </WidgetBase>
        );
    }

    if (!anniversary) {
        return (
            <WidgetBase variant="glass" className="flex items-center justify-center text-gray-400">
                <span className="text-xs">加载中...</span>
            </WidgetBase>
        );
    }

    const days = calculateDays(anniversary.date, anniversary.countMode);
    const dayLabel = anniversary.countMode === 'countdown' ? 'DAYS TO GO' : 'DAYS AGO';

    const renderAvatar = (src) => {
        return (
            <div className="w-16 h-16 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center">
                {src ? (
                    <img src={src} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                    <div className="text-gray-300">
                        <User size={24} />
                    </div>
                )}
            </div>
        );
    };

    // FATTER ROUNDED CURVED TAILS
    const LeftBubbleTail = () => (
        <svg
            width="20"
            height="14"
            viewBox="0 0 20 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute -bottom-[12px] left-1 z-[-1]"
        >
            <path
                d="M4 0C4 0 6 10 16 12C18 12.5 20 12.5 20 12.5C20 12.5 16 12.5 12 9C9 7 8 0 8 0H4Z"
                fill="white"
                fillOpacity="0.95"
            />
            <path
                d="M4 0C4 0 6 10 16 12C18 12.5 20 12.5 20 12.5C20 12.5 16 12.5 12 9C9 7 8 0 8 0"
                stroke="white"
                strokeOpacity="0.4"
                strokeWidth="0.8"
            />
        </svg>
    );

    const RightBubbleTail = () => (
        <svg
            width="20"
            height="14"
            viewBox="0 0 20 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute -bottom-[12px] right-1 z-[-1]"
        >
            <path
                d="M16 0C16 0 14 10 4 12C2 12.5 0 12.5 0 12.5C0 12.5 4 12.5 8 9C11 7 12 0 12 0H16Z"
                fill="white"
                fillOpacity="0.95"
            />
            <path
                d="M16 0C16 0 14 10 4 12C2 12.5 0 12.5 0 12.5C0 12.5 4 12.5 8 9C11 7 12 0 12 0"
                stroke="white"
                strokeOpacity="0.4"
                strokeWidth="0.8"
            />
        </svg>
    );

    return (
        <WidgetBase
            variant="transparent"
            className="group font-sans relative"
        >
            <div
                className="absolute inset-0 transition-colors duration-300 rounded-[24px] overflow-hidden z-0"
                style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
            >
                {bgSrc && (
                    <img src={bgSrc} className="w-full h-full object-cover opacity-90 transition-opacity" alt="bg" />
                )}
            </div>

            <div className="relative w-full h-full flex flex-col items-center justify-between py-4 px-2 z-10 rounded-[24px] overflow-hidden">
                <div className="w-full flex items-end justify-center gap-3 mt-8 flex-1">
                    {/* Left Person */}
                    <div className="flex flex-col items-center relative">
                        {/* Bubble - Moved slightly UP from previous (-top-5.5 / 22px) */}
                        <div className="absolute -top-[22px] left-1/2 -translate-x-1/2 z-20 transition-all duration-300 transform hover:-translate-y-0.5 w-max">
                            {leftMessage && (
                                <div className="relative bg-white/95 backdrop-blur-sm rounded-[14px] px-2.5 py-1 shadow-md border border-white/50 min-w-[50px] text-center flex items-center justify-center">
                                    <span className="text-[9px] text-gray-700 block leading-tight font-semibold">{leftMessage}</span>
                                    <LeftBubbleTail />
                                </div>
                            )}
                        </div>
                        <div className="relative z-10 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            {renderAvatar(leftSrc)}
                        </div>
                    </div>

                    {/* Right Person */}
                    <div className="flex flex-col items-center relative">
                        {/* Bubble - Moved slightly UP from previous (-top-5.5 / 22px) */}
                        <div className="absolute -top-[22px] left-1/2 -translate-x-1/2 z-20 transition-all duration-300 transform hover:-translate-y-0.5 w-max">
                            {rightMessage && (
                                <div className="relative bg-white/95 backdrop-blur-sm rounded-[14px] px-2.5 py-1 shadow-md border border-white/50 min-w-[50px] text-center flex items-center justify-center">
                                    <span className="text-[9px] text-gray-700 block leading-tight font-semibold">{rightMessage}</span>
                                    <RightBubbleTail />
                                </div>
                            )}
                        </div>
                        <div className="relative z-10 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                            {renderAvatar(rightSrc)}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center w-full mb-2">
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm border border-white/50 flex flex-col items-center justify-center min-w-[60px] transform scale-90 translate-y-0">
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-gray-700 tracking-tight">{days}</span>
                            <span className="text-[10px] font-bold text-gray-500 ml-0.5">天</span>
                        </div>
                        {dayLabel !== 'DAYS AGO' && (
                            <span className="text-[7px] text-gray-400 font-bold tracking-widest uppercase scale-75 origin-center opacity-70 mt-[-1px]">{dayLabel}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 z-50 rounded-[24px] overflow-hidden pointer-events-none">
                <SnowEffect active={showSnow} />
            </div>
        </WidgetBase>
    );
};

export default AnniversaryWidget;
