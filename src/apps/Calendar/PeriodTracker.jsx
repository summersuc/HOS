
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import IOSPage from '../../components/AppWindow/IOSPage';
import { Settings, ChevronLeft, ChevronRight, Droplets, Calendar as CalendarIcon, Info } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// -----------------------------------------------------------------------------
// Helper: Date Utilities
// -----------------------------------------------------------------------------
const formatDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// -----------------------------------------------------------------------------
// Component: Elegant Calendar Grid
// -----------------------------------------------------------------------------
const PeriodCalendarGrid = ({ currentMonth, periodLogs, predictedDates }) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = new Date(year, month, 1).getDay() === 0 ? 6 : new Date(year, month, 1).getDay() - 1;

    // Generate dates
    const dates = [];
    for (let i = 0; i < firstDayOfWeek; i++) dates.push(null);
    for (let i = 1; i <= daysInMonth; i++) dates.push(new Date(year, month, i));

    const todayDate = new Date();
    const isThisMonth = todayDate.getMonth() === month && todayDate.getFullYear() === year;
    const todayDay = todayDate.getDate();

    const getStatus = (date) => {
        if (!date) return null;
        const key = formatDateKey(date);

        const isLogged = periodLogs?.some(log => {
            if (!log.endDate) return key === log.startDate || (key >= log.startDate && key <= formatDateKey(new Date()));
            return key >= log.startDate && key <= log.endDate;
        });
        if (isLogged) return 'actual'; // Solid Pink

        if (predictedDates?.includes(key)) return 'predicted'; // Dashed Pink
        return null;
    };

    return (
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-white/20">
            <div className="grid grid-cols-7 gap-y-3 gap-x-1 mb-2">
                {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                    <div key={d} className="text-center text-[10px] text-gray-400 font-medium">{d}</div>
                ))}
                {dates.map((date, idx) => {
                    const status = getStatus(date);
                    const isToday = isThisMonth && date && date.getDate() === todayDay;

                    return (
                        <div key={idx} className="aspect-square flex items-center justify-center relative">
                            {date && (
                                <motion.div
                                    initial={false}
                                    className={`
                                        w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all relative
                                        ${isToday ? 'bg-gray-900 text-white dark:bg-white dark:text-black shadow-md z-10' : 'text-gray-700 dark:text-gray-300'}
                                    `}
                                >
                                    {/* Status Indicators */}
                                    {status === 'actual' && (
                                        <div className="absolute inset-0 bg-[#F48FB1] rounded-full opacity-100 z-[-1]" />
                                    )}
                                    {status === 'predicted' && (
                                        <div className="absolute inset-px border-2 border-[#F48FB1] border-dashed rounded-full opacity-60 pointer-events-none" />
                                    )}

                                    <span className={status === 'actual' ? 'text-white font-bold' : ''}>
                                        {date.getDate()}
                                    </span>
                                </motion.div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F48FB1]" /> 经期
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full border border-[#F48FB1] border-dashed" /> 预测期
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-white" /> 今天
                </div>
            </div>
        </div>
    );
};

// -----------------------------------------------------------------------------
// Component: Settings Popup (Glassmorphism)
// -----------------------------------------------------------------------------
const CycleSettingsEditor = ({ currentCycle, currentPeriod, onSave, onClose }) => {
    const [cycleStr, setCycleStr] = useState(String(currentCycle));
    const [periodStr, setPeriodStr] = useState(String(currentPeriod));

    const handleSave = () => {
        const c = parseInt(cycleStr) || 28;
        const p = parseInt(periodStr) || 5;
        onSave(c, p);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                onClick={e => e.stopPropagation()}
                className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-white/20 space-y-6"
            >
                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">周期设置</h3>
                    <p className="text-sm text-gray-500 mt-1">根据您的实际情况调整</p>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">平均周期长度</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={cycleStr}
                                onChange={e => setCycleStr(e.target.value)}
                                className="w-12 bg-white dark:bg-black rounded-lg text-center font-bold text-lg outline-none py-1 shadow-sm text-[#F48FB1]"
                            />
                            <span className="text-xs text-gray-400">天</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">经期持续天数</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={periodStr}
                                onChange={e => setPeriodStr(e.target.value)}
                                className="w-12 bg-white dark:bg-black rounded-lg text-center font-bold text-lg outline-none py-1 shadow-sm text-[#F48FB1]"
                            />
                            <span className="text-xs text-gray-400">天</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={onClose} className="py-3.5 text-gray-500 font-bold bg-gray-100 dark:bg-white/5 rounded-2xl transition-transform active:scale-95 text-sm">取消</button>
                    <button onClick={handleSave} className="py-3.5 text-white font-bold bg-[#F48FB1] rounded-2xl shadow-lg shadow-pink-200/50 transition-transform active:scale-95 text-sm">保存</button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// -----------------------------------------------------------------------------
// Component: Main Period Tracker
// -----------------------------------------------------------------------------
const PeriodTracker = ({ onBack }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [showSettings, setShowSettings] = useState(false);

    // DB Queries
    const logs = useLiveQuery(() => db.periodLogs.toArray()) || [];
    const settings = useLiveQuery(() => db.settings.get('period_settings')) || { cycleLength: 28, periodLength: 5 };

    // Find active log
    const todayKey = formatDateKey(new Date());
    const activeLog = logs.find(l => !l.endDate || (l.startDate <= todayKey && l.endDate >= todayKey));
    const isPeriodToday = !!activeLog;

    const handleTogglePeriod = async () => {
        triggerHaptic();
        if (isPeriodToday) {
            if (!activeLog.endDate) await db.periodLogs.update(activeLog.id, { endDate: todayKey });
            else if (activeLog.endDate === todayKey) await db.periodLogs.update(activeLog.id, { endDate: null });
        } else {
            await db.periodLogs.add({ startDate: todayKey, endDate: null });
        }
    };

    const handleSaveSettings = async (c, p) => {
        await db.settings.put({ key: 'period_settings', cycleLength: c, periodLength: p });
        setShowSettings(false);
    };

    // Calculate Predictions
    const predictedDates = useMemo(() => {
        if (logs.length === 0) return [];
        const sorted = [...logs].sort((a, b) => a.startDate.localeCompare(b.startDate));
        const lastPeriod = sorted[sorted.length - 1];
        const nextStart = new Date(lastPeriod.startDate);
        nextStart.setDate(nextStart.getDate() + (settings.cycleLength || 28));

        const predicted = [];
        for (let i = 0; i < (settings.periodLength || 5); i++) {
            const d = new Date(nextStart);
            d.setDate(d.getDate() + i);
            predicted.push(formatDateKey(d));
        }
        return predicted;
    }, [logs, settings]);

    // Days Until
    const daysUntil = useMemo(() => {
        if (!predictedDates.length) return null;
        const nextStart = predictedDates[0];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next = new Date(nextStart);
        const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
        return diff;
    }, [predictedDates]);

    return (
        <IOSPage
            title="经期助手"
            onBack={onBack}
            rightButton={
                <button onClick={() => setShowSettings(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 active:bg-white text-gray-600 dark:text-gray-300 backdrop-blur-sm">
                    <Settings size={18} />
                </button>
            }
        >
            <div className="min-h-full bg-gradient-to-b from-[#FCE4EC] to-[#F2F4F8] dark:from-[#3a1c24] dark:to-black">
                {/* Status Card */}
                <div className="pt-6 px-6 pb-8 text-center relative overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-10"
                    >
                        {isPeriodToday ? (
                            <>
                                <div className="inline-flex items-center justify-center p-3 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500 mb-3 animate-pulse">
                                    <Droplets size={32} fill="currentColor" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-1">经期第 <span className="text-[#F48FB1]">{Math.floor((new Date() - new Date(activeLog.startDate)) / (1000 * 60 * 60 * 24)) + 1}</span> 天</h2>
                                <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">记得多喝热水，注意保暖哦 ☕️</p>
                            </>
                        ) : daysUntil !== null ? (
                            <>
                                <div className="inline-flex items-center justify-center p-3 rounded-full bg-white/60 dark:bg-white/10 text-gray-400 mb-3">
                                    <CalendarIcon size={32} />
                                </div>
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-1">{daysUntil} <span className="text-lg font-bold text-gray-400">天</span></h2>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">距离下次经期</p>
                            </>
                        ) : (
                            <>
                                <div className="inline-flex items-center justify-center p-3 rounded-full bg-white/60 dark:bg-white/10 text-gray-400 mb-3">
                                    <Info size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">暂无数据</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">点击下方按钮记录第一次经期</p>
                            </>
                        )}
                    </motion.div>

                    {/* Big Action Button */}
                    <div className="mt-8 flex justify-center">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleTogglePeriod}
                            className={`
                                relative group overflow-hidden rounded-full w-40 h-40 flex flex-col items-center justify-center shadow-xl transition-all duration-500
                                ${isPeriodToday
                                    ? 'bg-gradient-to-br from-[#F48FB1] to-[#EC407A] shadow-pink-300/50 text-white'
                                    : 'bg-white dark:bg-[#1C1C1E] text-gray-400 dark:text-gray-500 border border-white/50 dark:border-white/5'}
                            `}
                        >
                            {isPeriodToday && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            <span className="text-3xl mb-1 filter drop-shadow-sm">{isPeriodToday ? '🩸' : '🌸'}</span>
                            <span className="font-bold text-sm tracking-wide">{isPeriodToday ? '结束记录' : '大姨妈来了'}</span>
                        </motion.button>
                    </div>
                </div>

                {/* Calendar Card */}
                <div className="px-4 pb-12">
                    <div className="flex items-center justify-between px-2 mb-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">周期日历</h3>
                        <div className="flex gap-1 bg-white/50 dark:bg-white/5 rounded-full p-0.5">
                            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1.5 rounded-full hover:bg-white dark:hover:bg-white/10 transition-colors">
                                <ChevronLeft size={16} className="text-gray-500" />
                            </button>
                            <span className="px-2 py-1 text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                                {viewDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                            </span>
                            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1.5 rounded-full hover:bg-white dark:hover:bg-white/10 transition-colors">
                                <ChevronRight size={16} className="text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <PeriodCalendarGrid
                        currentMonth={viewDate}
                        periodLogs={logs}
                        predictedDates={predictedDates}
                    />
                </div>
            </div>

            <AnimatePresence>
                {showSettings && (
                    <CycleSettingsEditor
                        currentCycle={settings.cycleLength || 28}
                        currentPeriod={settings.periodLength || 5}
                        onSave={handleSaveSettings}
                        onClose={() => setShowSettings(false)}
                    />
                )}
            </AnimatePresence>
        </IOSPage>
    );
};

export default PeriodTracker;
