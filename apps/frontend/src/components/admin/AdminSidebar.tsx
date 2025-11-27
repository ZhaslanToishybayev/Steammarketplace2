'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import {
  Cog6ToothIcon,
  UsersIcon,
  ScaleIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BoltIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  activeItem?: string;
  className?: string;
}

const menuItems = [
  {
    name: 'Dashboard',
    icon: ChartBarIcon,
    href: '/admin',
    description: 'Overview and statistics',
  },
  {
    name: 'Users',
    icon: UsersIcon,
    href: '/admin/users',
    description: 'Manage users and roles',
  },
  {
    name: 'Trades',
    icon: ScaleIcon,
    href: '/admin/trades',
    description: 'Monitor trade activity',
  },
  {
    name: 'Disputes',
    icon: ChatBubbleLeftRightIcon,
    href: '/admin/disputes',
    description: 'Handle trade disputes',
  },
  {
    name: 'Bots',
    icon: BoltIcon,
    href: '/admin/bots',
    description: 'Manage trading bots',
  },
  {
    name: 'Finance',
    icon: BanknotesIcon,
    href: '/admin/finance',
    description: 'Financial reports',
  },
  {
    name: 'Config',
    icon: Cog6ToothIcon,
    href: '/admin/config',
    description: 'System configuration',
  },
  {
    name: 'Audit Logs',
    icon: DocumentTextIcon,
    href: '/admin/audit',
    description: 'System audit logs',
  },
  {
    name: 'Moderation',
    icon: ShieldCheckIcon,
    href: '/admin/moderation',
    description: 'Content moderation',
  },
  {
    name: 'Reports',
    icon: UserGroupIcon,
    href: '/admin/reports',
    description: 'Generate reports',
  },
];

export function AdminSidebar({ activeItem, className }: AdminSidebarProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className={twMerge(
      'bg-gray-900 border-r border-gray-800 flex-shrink-0',
      isCollapsed ? 'w-20' : 'w-64',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-white font-semibold">Admin</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeItem === item.name.toLowerCase() || activeItem === item.href;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={twMerge(
                  'w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors group',
                  isActive
                    ? 'bg-orange-500/20 text-orange-400 border-r-2 border-orange-500'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800',
                  isCollapsed && 'justify-center space-x-0'
                )}
              >
                <Icon className={twMerge(
                  'flex-shrink-0',
                  isCollapsed ? 'w-6 h-6' : 'w-5 h-5'
                )} />
                {!isCollapsed && (
                  <div className="flex flex-col items-start">
                    <span className="text-left">{item.name}</span>
                    <span className="text-xs text-gray-500 text-left">
                      {item.description}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="space-y-2">
          {!isCollapsed && (
            <div className="text-xs text-gray-500">
              Admin Panel v1.0
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className={twMerge(
              'px-2 py-1 rounded text-xs',
              isCollapsed ? 'bg-green-500/20 text-green-400' : 'text-green-400'
            )}>
              Online
            </span>
            {!isCollapsed && (
              <button className="text-gray-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}