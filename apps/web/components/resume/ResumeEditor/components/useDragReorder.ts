'use client';

import { useState, type DragEvent } from 'react';

interface UseDragReorderOptions {
  onReorder?: (sourceId: string, targetId: string) => void;
}

export const useDragReorder = ({ onReorder }: UseDragReorderOptions) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (id: string) => (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;
    onReorder?.(sourceId, targetId);
  };

  const handleDragEnd = () => setDraggingId(null);

  return {
    draggingId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
};
