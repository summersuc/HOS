import React, { useState, useEffect } from 'react';
import { db } from '../../db/schema';
import IOSPage from '../../components/AppWindow/IOSPage';

const EVENT_COLORS = [
    { name: '珊瑚红', value: '#F48FB1' },
    { name: '天空蓝', value: '#3498DB' },
    { name: '薄荷绿', value: '#2ECC71' },
    { name: '阳光橙', value: '#F39C12' },
    { name: '梦幻紫', value: '#9B59B6' },
    { name: '玫瑰粉', value: '#E91E63' },
];

const EventEditor = ({ date, event, onBack, onSave }) => {
    const isEditing = !!event;

    const getLocalDateStr = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [formData, setFormData] = useState({
        title: '',
        date: getLocalDateStr(date),
        isAllDay: true,
        startTime: '09:00',
        endTime: '10:00',
        color: '#F48FB1',
        notes: '',
        repeat: 'none'
    });

    // 编辑模式初始化
    useEffect(() => {
        if (event) {
            setFormData({
                title: event.title || '',
                date: event.date || getLocalDateStr(date),
                isAllDay: event.isAllDay ?? true,
                startTime: event.startTime || '09:00',
                endTime: event.endTime || '10:00',
                color: event.color || '#F48FB1',
                notes: event.notes || '',
                repeat: event.repeat || 'none'
            });
        }
    }, [event, date]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            alert('请输入事件标题');
            return;
        }

        const eventData = {
            title: formData.title.trim(),
            date: formData.date,
            isAllDay: formData.isAllDay,
            startTime: formData.isAllDay ? null : formData.startTime,
            endTime: formData.isAllDay ? null : formData.endTime,
            color: formData.color,
            notes: formData.notes,
            repeat: formData.repeat,
            updatedAt: new Date().toISOString()
        };

        if (isEditing) {
            await db.calendarEvents.update(event.id, eventData);
        } else {
            eventData.createdAt = new Date().toISOString();
            await db.calendarEvents.add(eventData);
        }

        onSave();
    };

    return (
        <IOSPage
            title={isEditing ? '编辑事件' : '新建事件'}
            onBack={onBack}
            rightButton={
                <button
                    onClick={handleSubmit}
                    className="text-[#F48FB1] font-semibold text-[17px]"
                >
                    保存
                </button>
            }
        >
            <div className="p-4 space-y-4">
                {/* 标题输入 */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden">
                    <input
                        type="text"
                        placeholder="事件标题"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="w-full px-4 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none text-[17px]"
                    />
                </div>

                {/* 日期和时间 */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-[#2C2C2E]">
                    {/* 全天开关 */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-gray-900 dark:text-white">全天</span>
                        <button
                            onClick={() => handleChange('isAllDay', !formData.isAllDay)}
                            className={`w-12 h-7 rounded-full transition-colors ${formData.isAllDay ? 'bg-[#F48FB1]' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${formData.isAllDay ? 'translate-x-5' : 'translate-x-0.5'
                                }`} />
                        </button>
                    </div>

                    {/* 日期选择 */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-gray-900 dark:text-white">日期</span>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            className="bg-transparent text-[#F48FB1] outline-none"
                        />
                    </div>

                    {/* 时间选择（非全天时显示） */}
                    {!formData.isAllDay && (
                        <>
                            <div className="flex items-center justify-between px-4 py-3">
                                <span className="text-gray-900 dark:text-white">开始时间</span>
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => handleChange('startTime', e.target.value)}
                                    className="bg-transparent text-[#F48FB1] outline-none"
                                />
                            </div>
                            <div className="flex items-center justify-between px-4 py-3">
                                <span className="text-gray-900 dark:text-white">结束时间</span>
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => handleChange('endTime', e.target.value)}
                                    className="bg-transparent text-[#F48FB1] outline-none"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* 重复 */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-gray-900 dark:text-white">重复</span>
                        <select
                            value={formData.repeat}
                            onChange={(e) => handleChange('repeat', e.target.value)}
                            className="bg-transparent text-[#F48FB1] outline-none"
                        >
                            <option value="none">不重复</option>
                            <option value="daily">每天</option>
                            <option value="weekly">每周</option>
                            <option value="monthly">每月</option>
                            <option value="yearly">每年</option>
                        </select>
                    </div>
                </div>

                {/* 颜色选择 */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-xl p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">事件颜色</p>
                    <div className="flex gap-3 flex-wrap">
                        {EVENT_COLORS.map(color => (
                            <button
                                key={color.value}
                                onClick={() => handleChange('color', color.value)}
                                className={`w-10 h-10 rounded-full transition-transform ${formData.color === color.value ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : ''
                                    }`}
                                style={{ backgroundColor: color.value }}
                            />
                        ))}
                    </div>
                </div>

                {/* 备注 */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden">
                    <textarea
                        placeholder="添加备注..."
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none"
                    />
                </div>

                {/* 删除按钮（编辑模式） */}
                {isEditing && (
                    <button
                        onClick={async () => {
                            if (confirm('确定要删除这个事件吗？')) {
                                await db.calendarEvents.delete(event.id);
                                onBack();
                            }
                        }}
                        className="w-full py-3 bg-[#F48FB1]/10 text-[#F48FB1] rounded-xl font-medium"
                    >
                        删除事件
                    </button>
                )}
            </div>
        </IOSPage>
    );
};

export default EventEditor;
