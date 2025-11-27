'use client';

import { CSS } from '@dnd-kit/utilities';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SortableItem({ id, children, disabled = false, className }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useDraggable({
    id,
    disabled,
  });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -top-1 -right-1 w-6 h-6 bg-gray-600/80 rounded-full flex items-center justify-center text-xs text-gray-300 hover:bg-gray-500 transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="3" cy="3" r="1" />
            <circle cx="8" cy="3" r="1" />
            <circle cx="3" cy="8" r="1" />
            <circle cx="8" cy="8" r="1" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}

interface DroppableAreaProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
}

export function DroppableArea({ id, children, className, isActive = false }: DroppableAreaProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={className}
      style={{
        backgroundColor: isOver ? 'rgba(59, 130, 246, 0.1)' : undefined,
        border: isOver ? '2px dashed rgba(59, 130, 246, 0.5)' : undefined,
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </div>
  );
}