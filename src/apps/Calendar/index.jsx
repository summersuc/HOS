import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IOSPage from '../../components/AppWindow/IOSPage';
import CalendarView from './CalendarView';
import DayDetail from './DayDetail';
import EventEditor from './EventEditor';
import AnniversaryPage from './AnniversaryPage';
import PeriodTracker from './PeriodTracker';
import { triggerHaptic } from '../../utils/haptics';

const Calendar = ({ onClose }) => {
    // 视图状态: 'main' | 'day_detail' | 'event_editor' | 'anniversary' | 'period'
    const [view, setView] = useState('main');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingEvent, setEditingEvent] = useState(null);

    const handleSelectDate = (date) => {
        triggerHaptic?.();
        setSelectedDate(date);
        setView('day_detail');
    };

    const handleAddEvent = (date) => {
        triggerHaptic?.();
        setSelectedDate(date || new Date());
        setEditingEvent(null);
        setView('event_editor');
    };

    const handleEditEvent = (event) => {
        triggerHaptic?.();
        setEditingEvent(event);
        setView('event_editor');
    };

    const backToMain = () => {
        setView('main');
        setEditingEvent(null);
    };

    const isRoot = view === 'main';

    return (
        <div className="w-full h-full relative bg-transparent overflow-hidden">
            {/* 1. 主视图层 (始终挂载，保持稳定) */}
            <motion.div
                className="absolute inset-0 z-10"
                animate={{ scale: 1, opacity: 1 }}
            >
                <CalendarView
                    onClose={onClose}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                    onAddEvent={handleAddEvent}
                    onNavigateToAnniversary={() => { triggerHaptic?.(); setView('anniversary'); }}
                    onNavigateToPeriod={() => { triggerHaptic?.(); setView('period'); }}
                />
            </motion.div>

            {/* 2. 子页面层 (覆盖在主视图之上，使用 IOSPage 滑动动画) */}
            <AnimatePresence>
                {view === 'day_detail' && (
                    <DayDetail
                        key={`day-${selectedDate.toISOString()}`}
                        date={selectedDate}
                        onBack={backToMain}
                        onAddEvent={() => handleAddEvent(selectedDate)}
                        onEditEvent={handleEditEvent}
                    />
                )}

                {view === 'event_editor' && (
                    <EventEditor
                        key="editor"
                        date={selectedDate}
                        event={editingEvent}
                        onBack={() => setView(editingEvent ? 'day_detail' : 'main')}
                        onSave={() => setView('day_detail')}
                    />
                )}

                {view === 'anniversary' && (
                    <AnniversaryPage
                        key="anniversary"
                        onBack={backToMain}
                    />
                )}

                {view === 'period' && (
                    <PeriodTracker
                        key="period"
                        onBack={backToMain}
                    />
                )}
            </AnimatePresence>

            {/* 3. 边缘点击返回区域 */}
            {!isRoot && (
                <div
                    className="absolute inset-0 z-10 cursor-pointer"
                    onClick={backToMain}
                    style={{ width: '20px' }}
                />
            )}
        </div>
    );
};

export default Calendar;
