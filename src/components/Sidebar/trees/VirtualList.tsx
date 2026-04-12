import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  maxHeight?: number;
}

export function VirtualList<T>({ items, renderItem, estimateSize = 30, maxHeight = 300 }: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Only virtualize if many items
  if (items.length <= 50) {
    return <>{items.map((item, i) => renderItem(item, i))}</>;
  }

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      style={{ maxHeight, overflow: 'auto' }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              left: 0,
              width: '100%',
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
