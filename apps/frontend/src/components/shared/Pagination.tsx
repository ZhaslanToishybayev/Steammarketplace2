'use client';

import React from 'react';
import { Button } from './Button';
import { twMerge } from 'tailwind-merge';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showFirstLast?: boolean;
  showPrevNext?: boolean;
}

interface PaginationItemProps {
  page: number;
  isActive: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PaginationItem = ({ page, isActive, onClick, size = 'md', className }: PaginationItemProps) => (
  <Button
    variant={isActive ? 'primary' : 'ghost'}
    size={size}
    onClick={onClick}
    className={twMerge(
      'min-w-[32px] h-8',
      isActive && 'pointer-events-none',
      className
    )}
  >
    {page}
  </Button>
);

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  className,
  size = 'md',
  showFirstLast = true,
  showPrevNext = true,
}: PaginationProps) {
  const paginationRange = usePagination({
    currentPage,
    totalPages,
    siblingCount,
    boundaryCount,
  });

  if (currentPage === 0 || paginationRange.length < 2) {
    return null;
  }

  const onNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const onPrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const lastPage = paginationRange[paginationRange.length - 1];

  return (
    <nav className={twMerge('flex items-center space-x-2', className)}>
      {showFirstLast && (
        <PaginationItem
          page={1}
          isActive={false}
          onClick={() => onPageChange(1)}
          size={size}
          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
        />
      )}

      {showPrevNext && (
        <Button
          variant="ghost"
          size={size}
          onClick={onPrevious}
          disabled={currentPage === 1}
          className="min-w-[32px] h-8"
        >
          ‹
        </Button>
      )}

      {paginationRange.map((pageNumber, index) => {
        if (typeof pageNumber === 'string') {
          return (
            <span
              key={index}
              className={twMerge(
                'flex items-center justify-center min-w-[32px] h-8 text-sm text-gray-400',
                size === 'sm' && 'min-w-[28px] h-7 text-xs',
                size === 'lg' && 'min-w-[36px] h-9 text-base'
              )}
            >
              ...
            </span>
          );
        }

        return (
          <PaginationItem
            key={pageNumber}
            page={pageNumber}
            isActive={pageNumber === currentPage}
            onClick={() => onPageChange(pageNumber)}
            size={size}
          />
        );
      })}

      {showPrevNext && (
        <Button
          variant="ghost"
          size={size}
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="min-w-[32px] h-8"
        >
          ›
        </Button>
      )}

      {showFirstLast && (
        <PaginationItem
          page={totalPages}
          isActive={false}
          onClick={() => onPageChange(totalPages)}
          size={size}
          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
        />
      )}
    </nav>
  );
}

interface UsePaginationProps {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
  boundaryCount?: number;
}

function usePagination({
  currentPage,
  totalPages,
  siblingCount = 1,
  boundaryCount = 1,
}: UsePaginationProps): (number | string)[] {
  const totalPageNumbers = siblingCount + boundaryCount + 2;

  if (totalPageNumbers >= totalPages) {
    return range(1, totalPages);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > boundaryCount + 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - (boundaryCount + 1);

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    let leftItemCount = 3 + 2 * siblingCount;
    let leftRange = range(1, leftItemCount);

    return [...leftRange, '...', totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    let rightItemCount = 3 + 2 * siblingCount;
    let rightRange = range(totalPages - rightItemCount + 1, totalPages);

    return [firstPageIndex, '...', ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    let middleRange = range(leftSiblingIndex, rightSiblingIndex);
    return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
  }

  return range(1, totalPages);
}

function range(start: number, end: number): number[] {
  const length = end - start + 1;
  return Array.from({ length }, (_, index) => index + start);
}

// Simple pagination component for when you just need previous/next buttons
interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: SimplePaginationProps) {
  return (
    <div className={twMerge('flex items-center justify-between', className)}>
      <Button
        variant="ghost"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>

      <span className="text-sm text-gray-400">
        Page {currentPage} of {totalPages}
      </span>

      <Button
        variant="ghost"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}