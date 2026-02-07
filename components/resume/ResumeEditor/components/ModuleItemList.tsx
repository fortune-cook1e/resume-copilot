'use client';

import ItemActions from './ItemActions';
import { GripVertical } from 'lucide-react';
import { useDragReorder } from './useDragReorder';

interface BaseItem {
  id: string;
  visible: boolean;
}

interface ModuleItemListProps<TItem extends BaseItem> {
  items: TItem[];
  getTitle: (item: TItem) => string;
  getSubtitle?: (item: TItem) => string | undefined;
  onEdit: (item: TItem) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onReorder?: (sourceId: string, targetId: string) => void;
}

export default function ModuleItemList<TItem extends BaseItem>({
  items,
  getTitle,
  getSubtitle,
  onEdit,
  onRemove,
  onToggleVisibility,
  onReorder,
}: ModuleItemListProps<TItem>) {
  const { draggingId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(
    { onReorder },
  );

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          className={`group relative border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white ${
            draggingId === item.id ? 'ring-2 ring-blue-200' : ''
          } ${item.visible ? '' : 'opacity-60'}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop(item.id)}
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-1 cursor-grab text-gray-400 hover:text-gray-600"
              draggable
              onDragStart={handleDragStart(item.id)}
              onDragEnd={handleDragEnd}
            >
              <GripVertical className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{getTitle(item)}</div>
              {getSubtitle && (
                <div className="text-sm text-gray-500 truncate">{getSubtitle(item)}</div>
              )}
            </div>

            <ItemActions
              isVisible={item.visible}
              onToggleVisibility={() => onToggleVisibility(item.id)}
              onEdit={() => onEdit(item)}
              onRemove={() => onRemove(item.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
