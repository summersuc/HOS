import React, { useState } from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useTheme } from '../../context/ThemeContext';
import { SortableItem } from '../Desktop/Desktop';
import { appRegistry } from '../../config/appRegistry';
import { useApp } from '../../hooks/useApp';

const Dock = ({ isEditing }) => {
    const { openApp } = useApp();
    const { dockApps } = useTheme();
    const { setNodeRef } = useDroppable({
        id: 'dock-area'
    });

    // 始终渲染 4 个槽位，确保宽度和位置固定
    const slots = [0, 1, 2, 3];

    return (
        <div
            id="dock-area"
            ref={setNodeRef}
            className="mx-auto mb-2 px-3 py-2 flex items-center justify-center bg-transparent h-[80px] w-fit min-w-[320px]"
        >
            <div className="grid grid-cols-4 gap-2 w-full h-full max-w-[340px]">
                <SortableContext items={dockApps} strategy={horizontalListSortingStrategy}>
                    {slots.map(idx => {
                        const id = dockApps[idx];
                        if (!id) {
                            // 空槽位占位符，保持宽度一致
                            return <div key={`empty-${idx}`} className="flex-1 flex justify-center items-center" />;
                        }

                        const app = appRegistry[id];
                        if (!app) return <div key={`invalid-${id}`} className="flex-1 flex justify-center items-center" />;

                        return (
                            <div key={id} className="flex-1 flex justify-center items-center z-50">
                                <SortableItem
                                    id={id}
                                    content={id}
                                    isEditing={isEditing}
                                    inDock={true}
                                    onOpenApp={() => openApp(id)}
                                />
                            </div>
                        );
                    })}
                </SortableContext>
            </div>
        </div>
    );
};

export default Dock;
