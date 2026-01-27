import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Dock from '../Dock/Dock';
import AppIcon from './AppIcon';
import { useTheme } from '../../context/ThemeContext';
import { appRegistry } from '../../config/appRegistry';
import { WidgetRegistry, getWidgetSizeStyle } from '../Widgets/registry';
import { useApp } from '../../hooks/useApp';
import WidgetConfigModal from '../Widgets/WidgetConfigModal';
import ConfirmModal from '../common/ConfirmModal';
import {
    DndContext,
    rectIntersection, // Changed from closestCenter
    PointerSensor,
    useSensor,
    useSensors,
    TouchSensor,
    DragOverlay,
    MeasuringStrategy
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

// --- Unified Sortable Item (Exported for Dock) ---
export const SortableItem = ({ id, content, isEditing, onOpenApp, onDeleteWidget, onEditWidget, inDock = false }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id,
        disabled: !content && !isEditing
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1, // Shadow Placeholder: Visible but dimmed
        filter: isDragging ? 'grayscale(50%)' : 'none',
        touchAction: (isEditing && content) ? 'none' : 'manipulation',
        zIndex: isDragging ? 50 : 1
    };

    const getAspectClass = (content) => {
        if (!content) return 'aspect-square';
        if (typeof content === 'string') return 'aspect-square';
        if (typeof content === 'object') {
            const size = content.size || '2x2';
            switch (size) {
                case '4x4': return 'aspect-square';
                case '4x2': return 'aspect-[2/1]';
                case '2x4': return 'aspect-[1/2]';
                case '2x2': return 'aspect-square';
                default: return 'aspect-square';
            }
        }
        return 'aspect-square';
    };

    // 1. Empty Slot
    if (!content) {
        return (
            <div
                ref={setNodeRef} style={style} {...attributes} {...listeners}
                className={`w-full ${getAspectClass(content)} rounded-[18px] flex items-center justify-center border-2 border-dashed border-white/0`}
            >
                {isEditing && <div className="w-2 h-2 rounded-full bg-white/10" />}
            </div>
        );
    }

    // 2. App Icon
    if (typeof content === 'string') {
        const app = appRegistry[content];
        if (!app) return null;
        return (
            <div
                ref={setNodeRef} style={style} {...attributes} {...listeners}
                className={`relative flex items-start justify-center w-full ${isEditing && !inDock ? 'jiggle' : ''}`}
            >
                <AppIcon
                    app={app} inDock={inDock}
                    onClick={isEditing ? undefined : onOpenApp}
                />
            </div>
        );
    }

    // 3. Widget
    if (typeof content === 'object' && (content.type === 'widget' || content.type === 'widgetRef')) {
        // Safety: If it's still a ref (hydration failed) or missing type, render placeholder or null
        if (content.type === 'widgetRef') {
            return isEditing ? (
                <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-full h-full bg-red-500/20 rounded-xl flex items-center justify-center text-xs text-white">
                    Widget Error
                    <button onClick={() => onDeleteWidget(content)} className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full text-white">x</button>
                </div>
            ) : null;
        }

        const Config = WidgetRegistry[content.widgetType];
        if (!Config) return null;
        const Component = Config.component;

        const getSpanClass = (size) => {
            switch (size) {
                case '4x4': return 'col-span-4 row-span-4';
                case '4x2': return 'col-span-4 row-span-2';
                case '2x4': return 'col-span-2 row-span-4';
                case '2x2': return 'col-span-2 row-span-2';
                default: return 'col-span-2 row-span-2';
            }
        };

        return (
            <div
                ref={setNodeRef} style={style} {...attributes} {...listeners}
                className={`${getSpanClass(content.size)} ${getAspectClass(content)} relative group w-full`}
            >
                <motion.div className={`w-full h-full ${isEditing ? 'jiggle' : ''}`}>
                    <Component settings={content.settings} size={content.size} />

                    {isEditing && (
                        <>
                            <div
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); onDeleteWidget(content); }}
                                className="absolute -top-2 -left-2 w-6 h-6 bg-gray-500/80 rounded-full flex items-center justify-center z-50 text-white shadow-sm"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </div>
                            {Config.hasConfig && (
                                (
                                    <div
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); onEditWidget(content); }}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500/80 rounded-full flex items-center justify-center z-50 text-white shadow-sm"
                                    >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </div>
                                ))}
                        </>
                    )}
                </motion.div>
            </div>
        );
    }
    return null;
};

const GRID_COLS = 4;
const GRID_ROWS = 6;

const parseWidgetSize = (sizeStr) => {
    const [w, h] = (sizeStr || '2x2').split('x').map(Number);
    return { cols: w || 2, rows: h || 2 };
};

const getOccupiedSlots = (grid) => {
    const occupied = new Set();
    grid.forEach((item, i) => {
        if (item && typeof item === 'object' && item.type === 'widget') {
            const { cols: w, rows: h } = parseWidgetSize(item.size);
            const r_start = Math.floor(i / GRID_COLS);
            const c_start = i % GRID_COLS;
            for (let r = 0; r < h; r++) {
                for (let c = 0; c < w; c++) {
                    const idx = (r_start + r) * GRID_COLS + (c_start + c);
                    occupied.add(idx);
                }
            }
        }
    });
    return occupied;
};

const Desktop = () => {
    const { openApp } = useApp();
    const {
        desktopApps, setDesktopApps,
        dockApps, setDockApps,
        saveLayout, removeWidget, updateWidget,
        resetToDefaults // Destructure reset
    } = useTheme();

    const [isEditing, setIsEditing] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [configModal, setConfigModal] = useState({ isOpen: false, widget: null });
    const [isLayoutDirty, setIsLayoutDirty] = useState(false);
    const [activePageIndex, setActivePageIndex] = useState(0);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    // Critical Fix: Save layout effect to handle stale state in closures
    useEffect(() => {
        if (isLayoutDirty) {
            const saveAll = async () => {
                await saveLayout('desktop', desktopApps);
                await saveLayout('dock', dockApps);
            };
            saveAll();
            setIsLayoutDirty(false);
        }
    }, [isLayoutDirty, desktopApps, dockApps, saveLayout]);

    // Global Listen for App Launch Events (e.g. from Listen Together)
    React.useEffect(() => {
        const handleLaunch = (e) => {
            const { appId, params } = e.detail;
            if (appId && appRegistry[appId]) {
                openApp(appId, params); // openApp supports params? Need to check useApp hook
                // Assuming openApp(id) works. If params needed, useApp might need update or we rely on app internal listeners (like suki-app-share)
                // For now, openApp(appId) brings it to front.
            }
        };
        window.addEventListener('launch-app', handleLaunch);
        return () => window.removeEventListener('launch-app', handleLaunch);
    }, [openApp]);

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
        setIsEditing(true);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const findContainer = (id) => {
            if (dockApps.includes(id) || id === 'dock-area') return 'dock';
            if (String(id).startsWith('slot-') || id === 'desktop-area') return 'desktop';
            const isActiveInDesktop = desktopApps.some(item => (item === id) || (item?.id === id));
            if (isActiveInDesktop) return 'desktop';
            return null;
        };

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            // Early return if not a cross-container move? 
            // WAIT. If activeContainer === overContainer === 'desktop', we WANT to proceed for sorting!
            // The logic below has specific blocks for desktop-desktop.
            // But this check `if (!activeContainer || !overContainer || activeContainer === overContainer) return;` prevents it!
            // CRITICAL FIX: Allow same-container if it's desktop or dock.
            if (!activeContainer || !overContainer) return;

            // If different containers, proceed.
            // If same container, only proceed if we handle sorting.
            if (activeContainer === overContainer) {
                if (activeContainer === 'desktop') {
                    // Proceed to sorting logic
                } else if (activeContainer === 'dock') {
                    // Proceed to sorting logic
                } else {
                    return;
                }
            }
        }

        // Cross-container & Sorting logic
        if (activeContainer === 'desktop' && overContainer === 'desktop') {
            if (activeId !== overId) {
                setDesktopApps((items) => {
                    const activeIdx = items.findIndex(i => (i === activeId) || (i?.id === activeId));
                    let overIdx = -1;
                    if (String(overId).startsWith('slot-')) overIdx = parseInt(overId.split('-')[1]);
                    else overIdx = items.findIndex(i => (i === overId) || (i?.id === overId));

                    if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return items;

                    const next = [...items];
                    const activeItem = next[activeIdx];

                    // --- Collision Logic (Multi-Slot Support) ---

                    // 1. Calculate Footprint of Active Item
                    const activeFootprint = new Set();
                    const { cols, rows } = (activeItem && typeof activeItem === 'object' && activeItem.type === 'widget')
                        ? parseWidgetSize(activeItem.size)
                        : { cols: 1, rows: 1 };

                    // Adjust overIdx if widget hits boundary (Page-aware)
                    let targetIdx = overIdx;
                    // Determine which page this index belongs to
                    const ITEMS_PER_PAGE = 24;
                    const GRID_ROWS_PER_PAGE = 6;

                    const pageIndex = Math.floor(targetIdx / ITEMS_PER_PAGE);
                    const localIdx = targetIdx % ITEMS_PER_PAGE;

                    const r_local = Math.floor(localIdx / GRID_COLS);
                    const c_local = localIdx % GRID_COLS;

                    // Clamp Column
                    if (c_local + cols > GRID_COLS) targetIdx -= (c_local + cols - GRID_COLS);

                    // Clamp Row (Within Page)
                    if (r_local + rows > GRID_ROWS_PER_PAGE) {
                        const rowOverflow = (r_local + rows) - GRID_ROWS_PER_PAGE;
                        targetIdx -= rowOverflow * GRID_COLS;
                    }

                    if (targetIdx < 0) targetIdx = 0;

                    // Optimization: If target position is same as current, abort
                    if (targetIdx === activeIdx) return items;

                    // Compute indices covered by the widget at target position
                    const targetRow = Math.floor(targetIdx / GRID_COLS);
                    const targetCol = targetIdx % GRID_COLS;
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            const idx = (targetRow + r) * GRID_COLS + (targetCol + c);
                            if (idx < next.length) activeFootprint.add(idx);
                        }
                    }

                    // 2. Clear Old Slot (Leave Gap)
                    next[activeIdx] = null;

                    // 3. Identify Victims (Items currently in the footprint)
                    const victims = [];
                    activeFootprint.forEach(idx => {
                        if (next[idx]) {
                            victims.push(next[idx]);
                            next[idx] = null; // Evict them temporarily
                        }
                    });

                    // 4. Place Active Item
                    next[targetIdx] = activeItem;

                    // 5. Ripple Insert Victims (Nearest Gap Strategy)
                    const currentOccupied = getOccupiedSlots(next);
                    // Helper to check if an item fits at a position
                    const checkFit = (idx, item) => {
                        if (!item || typeof item !== 'object' || item.type !== 'widget') {
                            // Simple icon - just check bounds
                            return idx < next.length && !next[idx] && !currentOccupied.has(idx) && !activeFootprint.has(idx);
                        }
                        const { cols, rows } = parseWidgetSize(item.size);
                        const r_s = Math.floor(idx / GRID_COLS);
                        const c_s = idx % GRID_COLS;

                        // Check Page Boundary Crossing
                        const ITEMS_PER_PAGE = 24;
                        const GRID_ROWS_PER_PAGE = 6;

                        const pageStart = Math.floor(idx / ITEMS_PER_PAGE);
                        const localRow = r_s % GRID_ROWS_PER_PAGE;

                        // If widget extends beyond current page's rows
                        if (localRow + rows > GRID_ROWS_PER_PAGE) return false;
                        if (c_s + cols > GRID_COLS) return false;

                        for (let r = 0; r < rows; r++) {
                            for (let c = 0; c < cols; c++) {
                                const checkIdx = (r_s + r) * GRID_COLS + (c_s + c);
                                if (checkIdx >= next.length) return false;
                                if (next[checkIdx] || currentOccupied.has(checkIdx) || activeFootprint.has(checkIdx)) return false;
                            }
                        }
                        return true;
                    };

                    // Helper to mark slots as occupied after placement
                    const markOccupied = (idx, item) => {
                        if (!item || typeof item !== 'object' || item.type !== 'widget') {
                            currentOccupied.add(idx);
                            return;
                        }
                        const { cols, rows } = parseWidgetSize(item.size);
                        const r_s = Math.floor(idx / GRID_COLS);
                        const c_s = idx % GRID_COLS;
                        for (let r = 0; r < rows; r++) {
                            for (let c = 0; c < cols; c++) {
                                const checkIdx = (r_s + r) * GRID_COLS + (c_s + c);
                                currentOccupied.add(checkIdx);
                            }
                        }
                    };

                    victims.forEach(victim => {
                        let placed = false;
                        const startSearch = targetIdx;
                        let maxDist = Math.max(startSearch, next.length - startSearch);

                        // Function to attempt placement
                        const tryPlace = (idx) => {
                            if (idx < 0 || idx >= next.length) return false;
                            if (checkFit(idx, victim)) {
                                next[idx] = victim;
                                markOccupied(idx, victim);
                                return true;
                            }
                            return false;
                        };

                        for (let dist = 1; dist <= maxDist; dist++) {
                            if (tryPlace(startSearch + dist)) { placed = true; break; }
                            if (tryPlace(startSearch - dist)) { placed = true; break; }
                        }

                        if (!placed) {
                            // Fallback: Scan entire grid from 0
                            for (let i = 0; i < next.length; i++) {
                                if (tryPlace(i)) { placed = true; break; }
                            }
                        }
                    });

                    return next;
                });
            }
        } else if (activeContainer === 'desktop' && overContainer === 'dock') {
            // Desktop -> Dock
            const activeItem = desktopApps.find(i => (i === activeId) || (i?.id === activeId));
            if (activeItem && typeof activeItem === 'object') return; // Blocks widget to dock

            if (dockApps.length >= 4) return;
            setDesktopApps(items => items.map(i => i === activeId ? null : i));
            setDockApps(items => {
                const next = [...items];
                const overIdx = next.indexOf(overId);
                // Dedup check for dock
                if (!next.includes(activeId)) {
                    if (overIdx >= 0) next.splice(overIdx, 0, activeId);
                    else next.push(activeId);
                }
                return next;
            });
        } else if (activeContainer === 'dock' && overContainer === 'desktop') {
            // Dock -> Desktop
            // 1. Remove from Dock (Ensure type safety)
            setDockApps(items => items.filter(i => String(i) !== String(activeId)));

            setDesktopApps(items => {
                // 2. CRITICAL: Clean up ANY existing instance in desktop (Global Sweep)
                // Use map to ensure ID is removed from ALL slots
                const next = items.map(i => {
                    const iId = (i && typeof i === 'object') ? i.id : i;
                    return iId === activeId ? null : i;
                });

                let targetIdx = -1;
                if (String(overId).startsWith('slot-')) targetIdx = parseInt(overId.split('-')[1]);
                else targetIdx = next.findIndex(i => (i === overId) || (i?.id === overId));

                // Ripple Shift for Dock -> Desktop
                if (targetIdx !== -1) {
                    let currentItem = activeId; // The item coming from dock
                    let currentIdx = targetIdx;

                    while (currentIdx < next.length) {
                        const temp = next[currentIdx];
                        next[currentIdx] = currentItem;
                        if (temp === null) break;
                        currentItem = temp;
                        currentIdx++;
                    }
                } else {
                    // Fallback: First empty
                    const firstNull = next.indexOf(null);
                    if (firstNull !== -1) next[firstNull] = activeId;
                }
                return next;
            });
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) { setActiveId(null); return; }

        const activeId = active.id;
        const overId = over.id;

        const activeContainer = dockApps.includes(activeId) ? 'dock' : 'desktop';
        const overContainer = (dockApps.includes(overId) || overId === 'dock-area') ? 'dock' : 'desktop';

        if (activeContainer === 'dock' && overContainer === 'dock') {
            const oldIdx = dockApps.indexOf(activeId);
            const newIdx = dockApps.indexOf(overId);
            if (oldIdx !== -1 && newIdx !== -1) {
                const next = arrayMove(dockApps, oldIdx, newIdx);
                setDockApps(next);
                setIsLayoutDirty(true);
            }
        }

        // Finalize
        setActiveId(null);
        setIsLayoutDirty(true);
    };

    const renderGrid = (pageIndex) => {
        const start = pageIndex * 24;
        const end = start + 24;
        const processed = new Set();

        // Only map the slice for this page
        return desktopApps.slice(start, end).map((item, localIdx) => {
            const globalIdx = start + localIdx;

            if (processed.has(globalIdx)) return null;
            const id = (item && typeof item === 'object') ? item.id : (item || `slot-${globalIdx}`);

            // Update widget visual logic to be relative to the page? 
            // Actually, CSS grid handles the layout per page 4x6 (24 slots).
            // A widget at globalIdx 25 (Page 1, idx 1) should be at Row 0, Col 1 of Page 1.
            // The SortableItem just renders in flow order.

            // However, large widgets crossing page boundaries is tricky.
            // For now, assume widgets don't cross pages or getOccupiedSlots handles collision to prevent it.

            if (item && typeof item === 'object' && item.type === 'widget') {
                const { cols, rows } = parseWidgetSize(item.size);

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const targetIdx = globalIdx + (r * GRID_COLS) + c;
                        processed.add(targetIdx);
                    }
                }
            } else {
                processed.add(globalIdx);
            }

            return (
                <SortableItem
                    key={id} id={id} content={item} isEditing={isEditing}
                    onOpenApp={() => openApp(item)}
                    onDeleteWidget={(w) => setDeleteTarget(w)}
                    onEditWidget={(w) => setConfigModal({ isOpen: true, widget: w })}
                />
            );
        });
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always
                }
            }}
            autoScroll={{
                threshold: { x: 0.05, y: 0.05 }, // 5% threshold is much safer
                acceleration: 5 // Slower, smoother scroll
            }}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}
        >
            <div
                id="desktop-area"
                className={`flex flex-col h-full w-full pt-[var(--sat)] pb-[var(--sab)] px-2 select-none overflow-hidden`}
                onClick={(e) => {
                    const isBg = e.target.id === 'desktop-area' || e.target.id === 'grid-container' || e.target.id === 'status-bar-gap';
                    if (isBg && isEditing) setIsEditing(false);
                }}
            >
                <div id="status-bar-gap" className="h-2 w-full shrink-0" />

                {/* Edit Mode Done Button & Add Page Button */}
                <AnimatePresence>
                    {isEditing && (
                        <>
                            {/* Add Page Button (Left) */}
                            <motion.button
                                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => {
                                    setDesktopApps(prev => [...prev, ...new Array(24).fill(null)]);
                                    // Smooth scroll to the new page
                                    setTimeout(() => {
                                        const container = document.getElementById('grid-container');
                                        if (container) container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
                                    }, 100);
                                }}
                                className="absolute top-12 left-6 z-50 bg-[#333333] hover:bg-[#444444] text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-lg active:scale-95 transition-colors"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                            </motion.button>

                            {/* Done Button (Right) */}
                            <motion.button
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => setIsEditing(false)}
                                className="absolute top-12 right-6 z-50 bg-[#333333] hover:bg-[#444444] text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-lg active:scale-95 transition-colors"
                            >
                                完成
                            </motion.button>
                        </>
                    )}
                </AnimatePresence>

                <SortableContext
                    items={desktopApps.map((item, i) => (item && typeof item === 'object' ? item.id : (item || `slot-${i}`)))}
                    strategy={rectSortingStrategy}
                >
                    <div
                        id="grid-container"
                        className={`flex overflow-x-auto ${activeId ? '' : 'snap-x snap-mandatory'} scrollbar-hide h-full`}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onScroll={(e) => {
                            const page = Math.round(e.target.scrollLeft / e.target.clientWidth);
                            setActivePageIndex(page);
                            if (window.setDesktopPageIndex) window.setDesktopPageIndex(page);
                        }}
                    >
                        {Array.from({ length: Math.ceil(desktopApps.length / 24) || 1 }).map((_, pageIndex) => (
                            <div
                                key={pageIndex}
                                className="w-full flex-shrink-0 grid grid-cols-4 gap-x-2 gap-y-4 content-start min-h-0 px-2 snap-center"
                            >
                                {renderGrid(pageIndex)}
                            </div>
                        ))}
                    </div>
                    {/* Pagination Dots (Only show if > 1 page) */}
                    {(Math.ceil(desktopApps.length / 24) || 1) > 1 && (
                        <div className="absolute bottom-[100px] left-0 right-0 flex justify-center gap-2 pointer-events-none z-10">
                            {Array.from({ length: Math.ceil(desktopApps.length / 24) || 1 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === (activePageIndex || 0) ? 'bg-white' : 'bg-white/40'}`}
                                />
                            ))}
                        </div>
                    )}
                </SortableContext>

                {/* Empty State Recovery */}
                {desktopApps.every(i => i === null) && !isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                        <button
                            onClick={(e) => { e.stopPropagation(); resetToDefaults(); }}
                            className="pointer-events-auto bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-full font-medium shadow-lg transition-all active:scale-95"
                        >
                            恢复默认布局
                        </button>
                    </div>
                )}

                {/* Spacer to push Dock */}
                <div className="flex-1" />

                <DragOverlay>
                    {activeId ? (() => {
                        // ... (DragOverlay content logic remains same)
                        const item = desktopApps.find(i => (i === activeId) || (i?.id === activeId));
                        if (!item) {
                            const dockApp = dockApps.find(id => id === activeId);
                            if (dockApp) return <div className="scale-110 opacity-90"><AppIcon app={appRegistry[dockApp]} inDock={true} /></div>;
                            return null;
                        }
                        if (typeof item === 'string') return <div className="scale-110 opacity-90"><AppIcon app={appRegistry[item]} /></div>;

                        const Config = WidgetRegistry[item.widgetType];
                        const Component = Config?.component;
                        const sizeStyle = getWidgetSizeStyle(item.size);

                        return Component ? (
                            <div
                                className="opacity-80 scale-[1.02] pointer-events-none shadow-2xl z-[100]"
                                style={{
                                    width: sizeStyle.width,
                                    height: sizeStyle.height
                                }}
                            >
                                <Component settings={item.settings} size={item.size} />
                            </div>
                        ) : null;
                    })() : null}
                </DragOverlay>

                <div className="shrink-0 mb-0 relative z-50">
                    <Dock isEditing={isEditing} />
                </div>
            </div>

            <AnimatePresence>
                {configModal.isOpen && (
                    <WidgetConfigModal
                        isOpen={configModal.isOpen}
                        onClose={() => setConfigModal({ isOpen: false, widget: null })}
                        widgetType={configModal.widget?.widgetType}
                        config={WidgetRegistry[configModal.widget?.widgetType]}
                        initialSettings={configModal.widget?.settings}
                        onConfirm={async (settings) => {
                            await updateWidget(configModal.widget.id, settings);
                            setConfigModal({ isOpen: false, widget: null });
                        }}
                    />
                )}
            </AnimatePresence>
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="移除小组件？"
                message="移除后，该小组件将从主屏幕消失。"
                confirmText="移除"
                onConfirm={async () => {
                    await removeWidget(deleteTarget.id);
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />
        </DndContext>
    );
};

export default Desktop;
