import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import MonthGrid from './components/MonthGrid';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import IOSPage from '../../components/AppWindow/IOSPage';

const CalendarView = ({ onClose, selectedDate, onSelectDate, onAddEvent, onNavigateToAnniversary, onNavigateToPeriod }) => {
    // 当前视图的日期（用于切换月份，不一定是选中的日期）
    const [viewDate, setViewDate] = useState(new Date(selectedDate));
    const [today] = useState(new Date());

    // 同步外部传入的选中日期到视图
    useEffect(() => {
        if (selectedDate) {
            setViewDate(new Date(selectedDate));
        }
    }, [selectedDate]);

    // 获取当月事件
    const events = useLiveQuery(
        () => {
            const startStr = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1).toISOString();
            const endStr = new Date(viewDate.getFullYear(), viewDate.getMonth() + 2, 0).toISOString();
            return db.calendarEvents
                .where('date')
                .between(startStr, endStr)
                .toArray();
        },
        [viewDate]
    );

    // 将事件按日期归组
    const eventsByDate = (events || []).reduce((acc, event) => {
        // Assume event.date is ISO string or YYYY-MM-DD
        const dateKey = event.date.split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {});

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleToday = () => {
        const now = new Date();
        setViewDate(now);
        onSelectDate(now);
    };

    // 格式化月份标题
    const monthTitle = viewDate.toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' });

    // Edge swipe to close app (like IOSPage)
    return (
        <IOSPage
            title={null}
            onBack={onClose}
            enableEnterAnimation={true}
        >
            <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white relative">

                {/* 顶部导航栏 */}
                <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
                    {/* 左侧：菜单/关闭 */}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>

                    {/* 中间：月份切换 */}
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <motion.h2
                            key={monthTitle}
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-lg font-bold w-32 text-center"
                        >
                            {monthTitle}
                        </motion.h2>
                        <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* 右侧：回到今天 */}
                    <button
                        onClick={handleToday}
                        className="text-xs font-bold bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full text-[#F48FB1]"
                    >
                        今天
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-20">
                    {/* 功能快捷入口 */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={onNavigateToAnniversary}
                            className="flex items-center p-4 bg-pink-50 dark:bg-pink-900/10 rounded-2xl gap-3 border border-pink-100 dark:border-pink-900/30"
                        >
                            <div className="w-10 h-10 bg-white dark:bg-pink-900/30 rounded-full flex items-center justify-center text-xl shadow-sm">
                                ❤️
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-800 dark:text-white">纪念日</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">记录心动瞬间</p>
                            </div>
                        </motion.button>

                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={onNavigateToPeriod}
                            className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl gap-3 border border-purple-100 dark:border-purple-900/30"
                        >
                            <div className="w-10 h-10 bg-white dark:bg-purple-900/30 rounded-full flex items-center justify-center text-xl shadow-sm">
                                🌸
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-800 dark:text-white">经期助手</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">呵护自己</p>
                            </div>
                        </motion.button>
                    </div>

                    {/* 月历网格 */}
                    <MonthGrid
                        currentDate={viewDate}
                        today={today}
                        eventsByDate={eventsByDate}
                        onSelectDate={onSelectDate}
                        onLongPressDate={(date) => {
                            onSelectDate(date);
                            onAddEvent(date);
                        }}
                    />
                </div>

                {/* 底部添加按钮 - 浮动 */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAddEvent(selectedDate)}
                    className="absolute bottom-6 right-6 w-14 h-14 bg-[#F48FB1] text-white rounded-full flex items-center justify-center shadow-lg shadow-pink-200 z-20"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </motion.button>
            </div>
        </IOSPage>
    );
};

export default CalendarView;
