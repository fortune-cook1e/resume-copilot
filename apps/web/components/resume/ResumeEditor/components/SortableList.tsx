'use client';

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

export function SortableList({ ids, onReorder, children }: { ids: string[]; onReorder: (from: string, to: string) => void; children: ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id));
  }}><SortableContext items={ids} strategy={verticalListSortingStrategy}>{children}</SortableContext></DndContext>;
}

export function SortableItem({ id, className, children }: { id: string; className?: string; children: (handle: Pick<ReturnType<typeof useSortable>, 'attributes' | 'listeners' | 'setActivatorNodeRef'>) => ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id });
  return <div ref={setNodeRef} className={`relative motion-reduce:!transition-none ${isDragging ? 'z-20 rounded-lg bg-background shadow-lg' : ''} ${className ?? ''}`} style={{ transform: CSS.Translate.toString(transform), transition }}>
    {children({ attributes, listeners, setActivatorNodeRef })}
  </div>;
}
