import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { triggerHaptic } from '../../../utils/haptics';
import { Solar, Lunar, HolidayUtil } from 'lunar-javascript';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const MonthGrid = ({ currentDate, today, eventsByDate, onSelectDate, onLongPressDate }) => {
    // 计算月历数据
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 当月第一天
        const firstDay = new Date(year, month, 1);
        // 当月最后一天
        const lastDay = new Date(year, month + 1, 0);

        // 第一天是周几（0=周日，调整为周一开始）
        let startDayOfWeek = firstDay.getDay();
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

        const days = [];

        // 辅助函数：生成日期数据
        const generateDayData = (d, isCurrentMonth, isPrevMonth = false, isNextMonth = false) => {
            const dateObj = new Date(d);
            const solar = Solar.fromDate(dateObj);
            const lunar = solar.getLunar();
            const holiday = HolidayUtil.getHoliday(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());

            // 农历显示优先级：节日 > 节气 > 农历日
            let lunarText = lunar.getDayInChinese();
            let isFestival = false;

            // 节气
            const jieQi = lunar.getJieQi();
            if (jieQi) {
                lunarText = jieQi;
                isFestival = true;
            }

            // 农历节日
            const lunarFestivals = lunar.getFestivals();
            if (lunarFestivals.length > 0) {
                lunarText = lunarFestivals[0];
                isFestival = true;
            }

            // 公历节日
            const solarFestivals = solar.getFestivals();
            if (solarFestivals.length > 0) {
                // 过滤一些不重要的节日，或者全显示
                lunarText = solarFestivals[0];
                isFestival = true;
            }

            // 法定节假日名称覆盖（如春节、国庆）
            if (holiday) {
                const holidayName = holiday.getName();
                // 只有当是节假日当天或者特定的节日时才显示名字，避免"春节假期"占满格子
                // 这里简单处理：如果holiday存在，且是放假，优先显示节日名
                if (holiday.isWork()) {
                    // 调休工作日，不覆盖lunarText
                } else {
                    // 假期，尝试显示假期名，通常HolidayUtil的名字比较长，如"国庆节"，正好
                    lunarText = holidayName;
                    isFestival = true;
                }
            }

            // 初一显示月份
            if (!isFestival && lunar.getDay() === 1) {
                lunarText = lunar.getMonthInChinese() + '月';
            }

            return {
                date: dateObj,
                day: dateObj.getDate(),
                isCurrentMonth,
                isPrevMonth,
                isNextMonth,
                lunarText,
                isFestival,
                holidayData: holiday
            };
        };

        // 上个月的尾部日期
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            days.push(generateDayData(new Date(year, month - 1, day), false, true));
        }

        // 当月日期
        for (let day = 1; day <= lastDay.getDate(); day++) {
            days.push(generateDayData(new Date(year, month, day), true));
        }

        // 下个月的开头日期（填满6行42天）
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push(generateDayData(new Date(year, month + 1, day), false, false, true));
        }

        return days;
    }, [currentDate]);

    // 格式化日期为 YYYY-MM-DD (本地时间)
    const formatDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 检查是否是今天
    const isToday = (date) => {
        return formatDateKey(date) === formatDateKey(today);
    };

    // 长按计时器
    let longPressTimer = null;

    const handleTouchStart = (date) => {
        longPressTimer = setTimeout(() => {
            triggerHaptic?.();
            onLongPressDate(date);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    const handleClick = (date) => {
        triggerHaptic?.();
        onSelectDate(date);
    };

    return (
        <div className="bg-white/60 dark:bg-[#1C1C1E]/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-card border border-white/40 dark:border-white/5">
            {/* 星期头部 */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-[#2C2C2E]">
                {WEEKDAYS.map((day, idx) => (
                    <div
                        key={day}
                        className={`py-3 text-center text-xs font-semibold ${idx >= 5
                            ? 'text-[#F48FB1]'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7">
                {calendarDays.map((item, idx) => {
                    const dateKey = formatDateKey(item.date);
                    const dayEvents = eventsByDate[dateKey] || [];
                    const isTodayDate = isToday(item.date);
                    const isWeekend = idx % 7 >= 5;

                    // 节假日标记
                    const isWork = item.holidayData?.isWork(); // 调休上班
                    const isVacation = item.holidayData && !isWork; // 放假

                    return (
                        <motion.button
                            key={idx}
                            onClick={() => handleClick(item.date)}
                            onTouchStart={() => handleTouchStart(item.date)}
                            onTouchEnd={handleTouchEnd}
                            onMouseDown={() => handleTouchStart(item.date)}
                            onMouseUp={handleTouchEnd}
                            onMouseLeave={handleTouchEnd}
                            whileTap={{ scale: 0.9 }}
                            className={`
                                relative aspect-square flex flex-col items-center justify-center
                                transition-colors duration-150
                                ${item.isCurrentMonth
                                    ? isWeekend || isVacation
                                        ? 'text-[#F48FB1]'
                                        : 'text-gray-800 dark:text-white'
                                    : 'text-gray-300 dark:text-gray-600'
                                }
                                ${isWork ? 'bg-gray-50 dark:bg-white/5' : ''}
                                active:bg-gray-100/50 dark:active:bg-gray-800/30
                            `}
                        >
                            {/* 今日高亮圆圈 */}
                            {isTodayDate && (
                                <motion.div
                                    layoutId="today-indicator"
                                    className="absolute w-9 h-9 bg-[#F48FB1] rounded-full -z-10 shadow-md shadow-pink-200"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                />
                            )}

                            {/* 补班/休假 角标 */}
                            {item.holidayData && (
                                <span className={`absolute top-1 right-1 text-[8px] px-0.5 rounded ${isWork
                                        ? 'text-gray-500 bg-gray-200 dark:bg-gray-700'
                                        : 'text-white bg-[#F48FB1]'
                                    }`}>
                                    {isWork ? '班' : '休'}
                                </span>
                            )}

                            {/* 日期数字 */}
                            <span className={`
                                text-[15px] font-medium leading-none mb-0.5
                                ${isTodayDate ? 'text-white font-bold' : ''}
                            `}>
                                {item.day}
                            </span>

                            {/* 农历/节日文字 */}
                            <span className={`
                                text-[9px] leading-none transform scale-90
                                ${isTodayDate
                                    ? 'text-white/90'
                                    : item.isFestival
                                        ? 'text-[#F48FB1] font-medium'
                                        : 'text-gray-400 dark:text-gray-500'}
                            `}>
                                {item.lunarText}
                            </span>

                            {/* 事件点指示器 */}
                            {dayEvents.length > 0 && !isTodayDate && (
                                <div className="flex gap-0.5 mt-0.5 absolute bottom-1.5">
                                    {dayEvents.slice(0, 3).map((event, i) => (
                                        <div
                                            key={i}
                                            className="w-1 h-1 rounded-full"
                                            style={{ backgroundColor: event.color || '#F48FB1' }}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthGrid;
