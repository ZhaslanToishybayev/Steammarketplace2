'use client';

import { FixedSizeGrid as Grid, VariableSizeGrid as VariableGrid } from 'react-window';
import { CSSProperties, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useResizeObserver } from '@/hooks/useResizeObserver';

export interface VirtualizedGridProps {
  /** Number of columns */
  columnCount: number;
  /** Number of rows */
  rowCount: number;
  /** Width of each column in pixels */
  columnWidth: number | ((index: number) => number);
  /** Height of each row in pixels */
  rowHeight: number | ((index: number) => number);
  /** Total width of the grid */
  width: number;
  /** Total height of the grid */
  height: number;
  /** Items to render */
  items: any[];
  /** Render function for each cell */
  renderItem: (props: {
    columnIndex: number;
    rowIndex: number;
    style: CSSProperties;
    data: any;
    isScrolling?: boolean;
  }) => ReactNode;
  /** Additional class name */
  className?: string;
  /** Item data passed to render function */
  itemData?: any;
  /** Scroll to specific item */
  scrollToItem?: {
    align?: 'start' | 'center' | 'end' | 'auto';
    columnIndex?: number;
    rowIndex?: number;
  };
  /** Callback when scrolling */
  onScroll?: (props: {
    scrollDirection: 'forward' | 'backward';
    scrollLeft: number;
    scrollTop: number;
    verticalScrollDirection: 'forward' | 'backward';
    horizontalScrollDirection: 'forward' | 'backward';
  }) => void;
  /** Overscan count for performance */
  overscan?: {
    columnCount?: number;
    rowCount?: number;
  };
  /** Enable variable sizing */
  variableSize?: boolean;
  /** Custom row height function for variable sizing */
  getRowHeight?: (index: number) => number;
  /** Custom column width function for variable sizing */
  getColumnWidth?: (index: number) => number;
}

/**
 * Virtualized grid component using react-window for optimal performance
 * with large datasets
 */
export const VirtualizedGrid = ({
  columnCount,
  rowCount,
  columnWidth,
  rowHeight,
  width,
  height,
  items,
  renderItem,
  className,
  itemData,
  scrollToItem,
  onScroll,
  overscan = { columnCount: 2, rowCount: 2 },
  variableSize = false,
  getRowHeight,
  getColumnWidth,
}: VirtualizedGridProps) => {
  const gridRef = useRef<any>(null);

  // Handle scroll to item
  const handleScrollToItem = useCallback(() => {
    if (gridRef.current && scrollToItem) {
      gridRef.current.scrollToItem(
        {
          columnIndex: scrollToItem.columnIndex || 0,
          rowIndex: scrollToItem.rowIndex || 0,
        },
        scrollToItem.align || 'start'
      );
    }
  }, [scrollToItem]);

  // Handle scroll events
  const handleScroll = useCallback(
    (scrollProps: any) => {
      onScroll?.({
        scrollDirection: scrollProps.scrollDirection,
        scrollLeft: scrollProps.scrollLeft,
        scrollTop: scrollProps.scrollTop,
        verticalScrollDirection: scrollProps.verticalScrollDirection,
        horizontalScrollDirection: scrollProps.horizontalScrollDirection,
      });
    },
    [onScroll]
  );

  // Memoize item data to prevent unnecessary re-renders
  const memoizedItemData = useMemo(
    () => ({
      items,
      renderItem,
      itemData,
    }),
    [items, renderItem, itemData]
  );

  // Scroll to item when scrollToItem prop changes
  useMemo(() => {
    handleScrollToItem();
  }, [handleScrollToItem]);

  // Use variable size grid if enabled
  if (variableSize && (getRowHeight || getColumnWidth)) {
    return (
      <VariableGrid
        ref={gridRef}
        className={className}
        columnCount={columnCount}
        rowCount={rowCount}
        columnWidth={getColumnWidth || columnWidth}
        rowHeight={getRowHeight || rowHeight}
        width={width}
        height={height}
        itemData={memoizedItemData}
        onScroll={handleScroll}
        overscanColumnCount={overscan.columnCount}
        overscanRowCount={overscan.rowCount}
      >
        {({ columnIndex, rowIndex, style, isScrolling }) =>
          renderItem({
            columnIndex,
            rowIndex,
            style,
            data: memoizedItemData.items[rowIndex * columnCount + columnIndex],
            isScrolling,
          })
        }
      </VariableGrid>
    );
  }

  return (
    <Grid
      ref={gridRef}
      className={className}
      columnCount={columnCount}
      rowCount={rowCount}
      columnWidth={typeof columnWidth === 'function' ? columnWidth : () => columnWidth}
      rowHeight={typeof rowHeight === 'function' ? rowHeight : () => rowHeight}
      width={width}
      height={height}
      itemData={memoizedItemData}
      onScroll={handleScroll}
      overscanColumnCount={overscan.columnCount}
      overscanRowCount={overscan.rowCount}
    >
      {({ columnIndex, rowIndex, style, isScrolling }) =>
        renderItem({
          columnIndex,
          rowIndex,
          style,
          data: memoizedItemData.items[rowIndex * columnCount + columnIndex],
          isScrolling,
        })
      }
    </Grid>
  );
};

/**
 * Auto-sizing virtualized grid that adapts to container size
 */
export interface AutoSizedVirtualizedGridProps {
  /** Number of columns */
  columnCount: number;
  /** Number of rows */
  rowCount: number;
  /** Width of each column in pixels */
  columnWidth: number;
  /** Height of each row in pixels */
  rowHeight: number;
  /** Items to render */
  items: any[];
  /** Render function for each cell */
  renderItem: (props: {
    columnIndex: number;
    rowIndex: number;
    style: CSSProperties;
    data: any;
    isScrolling?: boolean;
  }) => ReactNode;
  /** Additional class name */
  className?: string;
  /** Item data passed to render function */
  itemData?: any;
  /** Minimum height for the grid */
  minHeight?: number;
  /** Maximum height for the grid */
  maxHeight?: number;
  /** Scroll to specific item */
  scrollToItem?: {
    align?: 'start' | 'center' | 'end' | 'auto';
    columnIndex?: number;
    rowIndex?: number;
  };
  /** Callback when scrolling */
  onScroll?: (props: {
    scrollDirection: 'forward' | 'backward';
    scrollLeft: number;
    scrollTop: number;
    verticalScrollDirection: 'forward' | 'backward';
    horizontalScrollDirection: 'forward' | 'backward';
  }) => void;
  /** Overscan count for performance */
  overscan?: {
    columnCount?: number;
    rowCount?: number;
  };
}

export const AutoSizedVirtualizedGrid = ({
  columnCount,
  rowCount,
  columnWidth,
  rowHeight,
  items,
  renderItem,
  className,
  itemData,
  minHeight = 400,
  maxHeight = 800,
  scrollToItem,
  onScroll,
  overscan,
}: AutoSizedVirtualizedGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);

  // Use ResizeObserver to track container size changes
  const { width, height } = useResizeObserver(containerRef, {
    box: 'border-box',
  });

  // Calculate grid dimensions based on container size
  const gridDimensions = useMemo(() => {
    const containerWidth = width || 0;
    const calculatedHeight = Math.min(Math.max(height || minHeight, minHeight), maxHeight || Infinity);

    // Ensure we don't exceed the container width
    const gridWidth = Math.min(containerWidth, columnCount * columnWidth);

    return {
      width: gridWidth,
      height: calculatedHeight,
    };
  }, [width, height, columnCount, columnWidth, rowHeight, minHeight, maxHeight]);

  // Handle scroll to item
  const handleScrollToItem = useCallback(() => {
    if (gridRef.current && scrollToItem) {
      gridRef.current.scrollToItem(
        {
          columnIndex: scrollToItem.columnIndex || 0,
          rowIndex: scrollToItem.rowIndex || 0,
        },
        scrollToItem.align || 'start'
      );
    }
  }, [scrollToItem]);

  // Handle scroll events
  const handleScroll = useCallback(
    (scrollProps: any) => {
      onScroll?.({
        scrollDirection: scrollProps.scrollDirection,
        scrollLeft: scrollProps.scrollLeft,
        scrollTop: scrollProps.scrollTop,
        verticalScrollDirection: scrollProps.verticalScrollDirection,
        horizontalScrollDirection: scrollProps.horizontalScrollDirection,
      });
    },
    [onScroll]
  );

  // Memoize item data to prevent unnecessary re-renders
  const memoizedItemData = useMemo(
    () => ({
      items,
      renderItem,
      itemData,
    }),
    [items, renderItem, itemData]
  );

  // Scroll to item when scrollToItem prop changes
  useMemo(() => {
    handleScrollToItem();
  }, [handleScrollToItem]);

  // Don't render until we have dimensions
  if (!gridDimensions.width || !gridDimensions.height) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ minHeight, maxHeight: maxHeight || 'none' }}
      >
        <div className="flex items-center justify-center" style={{ height: minHeight }}>
          <div className="w-8 h-8 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight, maxHeight: maxHeight || 'none' }}
    >
      <Grid
        ref={gridRef}
        columnCount={columnCount}
        rowCount={rowCount}
        columnWidth={columnWidth}
        rowHeight={rowHeight}
        width={gridDimensions.width}
        height={gridDimensions.height}
        itemData={memoizedItemData}
        onScroll={handleScroll}
        overscanColumnCount={overscan?.columnCount}
        overscanRowCount={overscan?.rowCount}
      >
        {({ columnIndex, rowIndex, style, isScrolling }) =>
          renderItem({
            columnIndex,
            rowIndex,
            style,
            data: memoizedItemData.items[rowIndex * columnCount + columnIndex],
            isScrolling,
          })
        }
      </Grid>
    </div>
  );
};

/**
 * Hook for managing virtualized grid state
 */
export const useVirtualizedGrid = (options: {
  items: any[];
  columnCount: number;
  itemWidth: number;
  itemHeight: number;
  containerWidth?: number;
  containerHeight?: number;
  gap?: number;
}) => {
  const {
    items,
    columnCount,
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    gap = 0,
  } = options;

  // Calculate grid dimensions
  const gridDimensions = useMemo(() => {
    const calculatedColumnCount = columnCount;
    const calculatedRowCount = Math.ceil(items.length / calculatedColumnCount);
    const calculatedWidth = containerWidth || calculatedColumnCount * (itemWidth + gap);
    const calculatedHeight = containerHeight || calculatedRowCount * (itemHeight + gap);

    return {
      columnCount: calculatedColumnCount,
      rowCount: calculatedRowCount,
      width: calculatedWidth,
      height: calculatedHeight,
    };
  }, [items.length, columnCount, itemWidth, itemHeight, containerWidth, containerHeight, gap]);

  // Get item index from row and column
  const getItemIndex = useCallback(
    (rowIndex: number, columnIndex: number) => {
      return rowIndex * gridDimensions.columnCount + columnIndex;
    },
    [gridDimensions.columnCount]
  );

  // Get row and column from item index
  const getRowColumn = useCallback(
    (index: number) => {
      const rowIndex = Math.floor(index / gridDimensions.columnCount);
      const columnIndex = index % gridDimensions.columnCount;
      return { rowIndex, columnIndex };
    },
    [gridDimensions.columnCount]
  );

  return {
    ...gridDimensions,
    getItemIndex,
    getRowColumn,
  };
};