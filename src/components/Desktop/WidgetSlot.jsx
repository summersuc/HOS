import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { WidgetRegistry, WIDGET_SIZES } from '../Widgets/registry';
import { motion } from 'framer-motion';
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
import ConfirmModal from '../common/ConfirmModal';

// --- Sortable Item ---
const SortableWidget = ({ widget, isEditing, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: widget.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        touchAction: 'none' // Critical for mobile PWA drag
    };

    const Config = WidgetRegistry[widget.type];
    if (!Config) return null;
    const Component = Config.component;

    // Helper to determine Grid Spans (Fixed: Removed aspect-ratio to match grid fluidly)
    const getGridSpan = (size) => {
        switch (size) {
            case WIDGET_SIZES.ICON: return 'col-span-1 row-span-1';
            case WIDGET_SIZES.SMALL: return 'col-span-2 row-span-2';
            case WIDGET_SIZES.WIDE_SMALL: return 'col-span-2 row-span-1';
            case WIDGET_SIZES.MEDIUM: return 'col-span-4 row-span-2'; // 4x2
            case WIDGET_SIZES.LARGE: return 'col-span-4 row-span-4';
            case WIDGET_SIZES.VERTICAL_S: return 'col-span-1 row-span-2';
            case WIDGET_SIZES.VERTICAL_M: return 'col-span-1 row-span-3';
            default: return 'col-span-2 row-span-2';
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`${getGridSpan(widget.size)} relative group touch-none select-none`}>
            <motion.div
                className={`w-full h-full relative ${isEditing ? 'jiggle' : ''}`} // Add jiggle only to content
                initial={{ opacity: 0 }}
                animate={{ opacity: isDragging ? 0.5 : 1 }}
            >
                <Component settings={widget.settings} size={widget.size} />

                {/* Delete Button */}
                {isEditing && (
                    <div
                        onPointerDown={(e) => {
                            e.stopPropagation(); // Prevent drag start on button
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(widget);
                        }}
                        className="absolute -top-2 -left-2 w-6 h-6 bg-gray-400/80 hover:bg-red-500 rounded-full flex items-center justify-center cursor-pointer z-50 text-white backdrop-blur-md shadow-sm transition-colors animate-in fade-in zoom-in duration-200"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

// --- Main Component ---
const WidgetSlot = ({ isEditing }) => {
    const { widgets, reorderWidgets, removeWidget } = useTheme();
    const [activeId, setActiveId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, {
            // Mobile: Long press to activate or quick drag in edit mode?
            // Matching previous working config
            activationConstraint: { delay: 100, tolerance: 5 }
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = widgets.findIndex(w => w.id === active.id);
            const newIndex = widgets.findIndex(w => w.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(widgets, oldIndex, newIndex);
                reorderWidgets(newOrder); // Persist
            }
        }
        setActiveId(null);
    };

    const handleDelete = async () => {
        if (deleteTarget) {
            await removeWidget(deleteTarget.id);
            setDeleteTarget(null);
        }
    };

    if (!widgets || widgets.length === 0) return null;

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-4 gap-x-4 gap-y-6 w-full mb-6">
                        {widgets.map(widget => (
                            <SortableWidget
                                key={widget.id}
                                widget={widget}
                                isEditing={isEditing}
                                onDelete={setDeleteTarget}
                            />
                        ))}
                    </div>
                </SortableContext>

                <DragOverlay>
                    {activeId ? (
                        (() => {
                            const w = widgets.find(w => w.id === activeId);
                            if (!w) return null;
                            const Config = WidgetRegistry[w.type];
                            const Component = Config?.component;
                            return Component ? (
                                <div className="opacity-80 scale-105">
                                    <Component settings={w.settings} size={w.size} />
                                </div>
                            ) : null;
                        })()
                    ) : null}
                </DragOverlay>
            </DndContext>

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="移除小组件？"
                message="移除后，该小组件将从主屏幕消失。"
                confirmText="移除"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </>
    );
};

export default WidgetSlot;
