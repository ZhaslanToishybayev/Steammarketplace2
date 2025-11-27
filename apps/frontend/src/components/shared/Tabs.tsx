'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps {
  children: ReactNode;
  defaultTab?: string;
  className?: string;
  variant?: 'line' | 'boxed' | 'pills';
  size?: 'sm' | 'md' | 'lg';
}

export function Tabs({
  children,
  defaultTab,
  className,
  variant = 'line',
  size = 'md',
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || '');

  const contextValue: TabsContextType = {
    activeTab,
    setActiveTab,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
  variant?: 'line' | 'boxed' | 'pills';
  size?: 'sm' | 'md' | 'lg';
}

export function TabsList({
  children,
  className,
  variant = 'line',
  size = 'md',
}: TabsListProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsList must be used within Tabs');
  }

  const baseClasses = 'flex';
  const variantClasses = {
    line: '',
    boxed: 'bg-gray-800 border border-gray-700 rounded-t-lg',
    pills: 'bg-gray-800/50 rounded-lg p-1',
  };

  const sizeClasses = {
    sm: 'space-x-1',
    md: 'space-x-2',
    lg: 'space-x-4',
  };

  return (
    <div className={twMerge(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: 'line' | 'boxed' | 'pills';
  size?: 'sm' | 'md' | 'lg';
}

export function TabsTrigger({
  value,
  children,
  className,
  disabled = false,
  variant = 'line',
  size = 'md',
}: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs');
  }

  const { activeTab, setActiveTab } = context;

  const isActive = activeTab === value;

  const baseClasses = [
    'flex items-center justify-center font-medium transition-all duration-200 focus:outline-none',
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
  ].filter(Boolean);

  const variantClasses = {
    line: [
      'border-b-2',
      isActive
        ? 'text-orange-500 border-orange-500'
        : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-600',
    ],
    boxed: [
      'bg-gray-800 border border-gray-700 rounded',
      isActive
        ? 'bg-gray-900 text-white'
        : 'text-gray-400 hover:text-gray-300',
    ],
    pills: [
      'rounded-md',
      isActive
        ? 'bg-orange-600 text-white shadow-md'
        : 'text-gray-400 hover:bg-gray-700',
    ],
  };

  const sizeClasses = {
    sm: ['text-sm px-3 py-1.5', isActive && variant === 'line' && 'pb-2'],
    md: ['text-base px-4 py-2', isActive && variant === 'line' && 'pb-2.5'],
    lg: ['text-lg px-6 py-3', isActive && variant === 'line' && 'pb-3'],
  };

  const classes = [
    ...baseClasses,
    ...variantClasses[variant],
    ...sizeClasses[size],
  ];

  return (
    <button
      className={twMerge(classes.join(' '), className)}
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be used within Tabs');
  }

  const { activeTab } = context;

  if (activeTab !== value) {
    return null;
  }

  return (
    <div className={twMerge('animate-in fade-in-0 zoom-in-95 duration-200', className)}>
      {children}
    </div>
  );
}

// Alternative API for easier usage
interface SimpleTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  defaultTab?: string;
  className?: string;
  variant?: 'line' | 'boxed' | 'pills';
  size?: 'sm' | 'md' | 'lg';
}

export function SimpleTabs({
  tabs,
  defaultTab,
  className,
  variant = 'line',
  size = 'md',
}: SimpleTabsProps) {
  const firstTabId = tabs[0]?.id || '';

  return (
    <Tabs defaultTab={defaultTab || firstTabId} className={className}>
      <TabsList variant={variant} size={size}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            variant={variant}
            size={size}
          >
            {tab.icon && <tab.icon className="w-4 h-4 mr-2" />}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}