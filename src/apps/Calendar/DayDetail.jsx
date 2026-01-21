import React from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import IOSPage from '../../components/AppWindow/IOSPage';

const DayDetail = ({ date, onBack, onAddEvent, onEditEvent }) => {
    // 格式化日期 (本地日期 Key)
    const year = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;

    // 获取当日事件
    const events = useLiveQuery(
        () => db.calendarEvents.where('date').equals(dateKey).toArray(),
        [dateKey]
    );

    // 格式化日期显示 (本地时间)
    const dateDisplay = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    // 删除事件
    const handleDeleteEvent = async (eventId) => {
        if (confirm('确定要删除这个事件吗？')) {
            await db.calendarEvents.delete(eventId);
        }
    };

    // 按时间排序事件
    const sortedEvents = [...(events || [])].sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return (
        <IOSPage
            title={dateDisplay}
            onBack={onBack}
            rightButton={
                <button
                    onClick={onAddEvent}
                    className="p-2 text-[#F48FB1]"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            }
        >
            <div className="p-4 space-y-4">
                {/* 日期卡片 */}
                <div className="bg-gradient-to-br from-[#F48FB1] to-[#FAD0C4] rounded-2xl p-6 text-white text-center shadow-lg">
                    <p className="text-6xl font-bold mb-2">{date.getDate()}</p>
                    <p className="text-lg opacity-90">
                        {date.toLocaleDateString('zh-CN', { month: 'long', weekday: 'long' })}
                    </p>
                </div>

                {/* 事件列表 */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-1">
                        日程安排
                    </h3>

                    {sortedEvents.length > 0 ? (
                        <div className="space-y-2">
                            {sortedEvents.map(event => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 shadow-sm flex items-start gap-3"
                                >
                                    <div
                                        className="w-1 h-full min-h-[40px] rounded-full shrink-0"
                                        style={{ backgroundColor: event.color || '#F48FB1' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {event.title}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {event.isAllDay ? '🌅 全天' : `🕐 ${event.startTime} - ${event.endTime || ''}`}
                                        </p>
                                        {event.notes && (
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 line-clamp-2">
                                                {event.notes}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => onEditEvent(event)}
                                            className="p-2 text-gray-400 hover:text-blue-500"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-2 text-gray-400 hover:text-[#F48FB1]"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#1C1C1E] rounded-xl p-8 text-center">
                            <p className="text-4xl mb-3">📅</p>
                            <p className="text-gray-500 dark:text-gray-400">这一天还没有安排</p>
                            <button
                                onClick={onAddEvent}
                                className="mt-4 px-6 py-2 bg-[#F48FB1] text-white rounded-full text-sm font-medium"
                            >
                                添加事件
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </IOSPage>
    );
};

export default DayDetail;
