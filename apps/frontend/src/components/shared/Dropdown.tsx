'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

interface DropdownProps {
  children: ReactNode;
  className?: string;
}

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function Dropdown({ children, className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const contextValue: DropdownContextType = {
    isOpen,
    setIsOpen,
  };

  return (
    <DropdownContext.Provider value={contextValue}>
      <div className={className}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
}

export function DropdownTrigger({ children, className }: DropdownTriggerProps) {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('DropdownTrigger must be used within a Dropdown');
  }

  const { setIsOpen } = context;

  return (
    <div
      className={twMerge('cursor-pointer', className)}
      onClick={() => setIsOpen(!context.isOpen)}
    >
      {children}
    </div>
  );
}

interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export function DropdownMenu({ children, className, align = 'right' }: DropdownMenuProps) {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('DropdownMenu must be used within a Dropdown');
  }

  const { isOpen } = context;

  if (!isOpen) return null;

  return (
    <div
      className={twMerge(
        'absolute z-50 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 border border-gray-700',
        align === 'right' ? 'origin-top-right right-0' : 'origin-top-left left-0',
        className
      )}
    >
      <div className="py-1">
        {children}
      </div>
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function DropdownItem({ children, onClick, icon: Icon, className }: DropdownItemProps) {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('DropdownItem must be used within a Dropdown');
  }

  const { setIsOpen } = context;

  const handleClick = () => {
    onClick();
    setIsOpen(false);
  };

  return (
    <div
      className={twMerge(
        'flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer transition-colors',
        className
      )}
      onClick={handleClick}
    >
      {Icon && <Icon className="w-4 h-4 mr-3 text-gray-400" />}
      {children}
    </div>
  );
}

// Alternative API for easier migration from Headless UI
export const DropdownButton = DropdownTrigger;
export const DropdownContent = DropdownMenu;
export const DropdownOption = DropdownItem;

// Hook for managing dropdown state externally
export function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('useDropdown must be used within a Dropdown');
  }
  return context;
}