import React, { useState, useEffect } from 'react';
import Dock from '../Dock/Dock';
import AppIcon from './AppIcon';
import WidgetSlot from './WidgetSlot';
import { appRegistry } from '../../config/appRegistry';
import { useApp } from '../../hooks/useApp';
import { db } from '../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    TouchSensor,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Draggable Item Wrapper
const SortableAppItem = ({ id, isEditing, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1, // Hide original when dragging
        touchAction: 'none' // Important for DND
    };

    const app = appRegistry[id];

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`relative ${isEditing ? 'jiggle' : ''}`}
        >
            {/* Overlay 'X' button for deletion could go here in future */}
            <AppIcon
                app={app}
                onClick={isEditing ? undefined : onClick} // Disable click in edit mode
            />
        </div>
    );
};

const Desktop = () => {
    const { openApp } = useApp();
    const layout = useLiveQuery(() => db.layout.get('default'));
    const [apps, setApps] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [activeId, setActiveId] = useState(null); // For DragOverlay

    // Default Init
    useEffect(() => {
        if (layout?.desktopApps) {
            setApps(layout.desktopApps);
        } else if (layout === undefined) {
            // First load or empty
            const defaultApps = ['calendar', 'notes', 'games'];
            setApps(defaultApps);
        }
    }, [layout]);

    // Save on change
    const saveLayout = async (newApps) => {
        setApps(newApps);
        await db.layout.put({
            id: 'default',
            desktopApps: newApps,
            ...layout
        });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Avoid accidental drags
            },
        }),
        useSensor(TouchSensor, {
            // Mobile: Long press to activate (250ms delay)
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
        setIsEditing(true); // Auto-enter edit mode on drag
        triggerHaptic(); // Vibrate on pickup
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        triggerHaptic(); // Vibrate on drop

        if (active.id !== over?.id) {
            const oldIndex = apps.indexOf(active.id);
            const newIndex = apps.indexOf(over.id);
            const newOrder = arrayMove(apps, oldIndex, newIndex);
            saveLayout(newOrder);
        }
        setActiveId(null);
    };

    // Exit edit mode on background click
    const handleBackgroundClick = (e) => {
        if (e.target === e.currentTarget && isEditing) {
            setIsEditing(false);
        }
    };

    // Helper for Haptics (Import if needed, or inline)
    const triggerHaptic = () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div
                className="flex flex-col h-full w-full pt-[var(--sat)] pb-[var(--sab)] px-4"
                onClick={handleBackgroundClick}
            >
                {/* 状态栏占位 (透明) */}
                <div className="h-6 w-full shrink-0" onClick={handleBackgroundClick} />

                {/* 小组件区域 (Placeholder for now) */}
                <div className="h-40 w-full mb-4 shrink-0" onClick={handleBackgroundClick}>
                    <WidgetSlot />
                </div>

                {/* 图标网格区域 */}
                <SortableContext items={apps} strategy={rectSortingStrategy}>
                    <div className="flex-1 grid grid-cols-4 gap-x-4 gap-y-6 content-start justify-items-center" onClick={handleBackgroundClick}>
                        {apps.map(id => {
                            if (!appRegistry[id]) return null;
                            return (
                                <SortableAppItem
                                    key={id}
                                    id={id}
                                    isEditing={isEditing}
                                    onClick={() => openApp(id)}
                                />
                            );
                        })}
                    </div>
                </SortableContext>

                {/* Drag Overlay (Visible when dragging) */}
                <DragOverlay>
                    {activeId ? (
                        <div className="scale-110 opacity-90">
                            <AppIcon app={appRegistry[activeId]} inDock={false} />
                        </div>
                    ) : null}
                </DragOverlay>

                {/* 底部 Dock */}
                <div className="shrink-0 mb-2 relative z-50">
                    <Dock />
                </div>
            </div>
        </DndContext>
    );
};

export default Desktop;
