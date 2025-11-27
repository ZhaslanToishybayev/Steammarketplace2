'use client';

import { useState, useEffect } from 'react';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Disclosure } from '@headlessui/react';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';

interface FilterState {
  game?: string;
  rarity?: string[];
  wear?: string[];
  minPrice?: number;
  maxPrice?: number;
  minFloat?: number;
  maxFloat?: number;
  search?: string;
  sort?: string;
}

interface SidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClear: () => void;
  className?: string;
}

export function Sidebar({ filters, onFilterChange, onClear, className = '' }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const games = [
    { id: '730', name: 'CS2', icon: 'CS2' },
    { id: '570', name: 'Dota 2', icon: 'D2' },
    { id: '440', name: 'TF2', icon: 'TF2' },
    { id: '252490', name: 'Rust', icon: 'R' },
  ];

  const rarities = [
    { id: 'common', name: 'Common', color: 'gray' },
    { id: 'uncommon', name: 'Uncommon', color: 'green' },
    { id: 'rare', name: 'Rare', color: 'blue' },
    { id: 'mythical', name: 'Mythical', color: 'purple' },
    { id: 'legendary', name: 'Legendary', color: 'orange' },
    { id: 'ancient', name: 'Ancient', color: 'red' },
  ];

  const wears = [
    { id: 'fn', name: 'Factory New', abbreviation: 'FN' },
    { id: 'mw', name: 'Minimal Wear', abbreviation: 'MW' },
    { id: 'ft', name: 'Field-Tested', abbreviation: 'FT' },
    { id: 'ww', name: 'Well-Worn', abbreviation: 'WW' },
    { id: 'bs', name: 'Battle-Scarred', abbreviation: 'BS' },
  ];

  const sorts = [
    { id: 'price-asc', name: 'Price: Low to High' },
    { id: 'price-desc', name: 'Price: High to Low' },
    { id: 'name-asc', name: 'Name: A to Z' },
    { id: 'name-desc', name: 'Name: Z to A' },
    { id: 'rarity', name: 'Rarity' },
    { id: 'float-asc', name: 'Float: Low to High' },
    { id: 'float-desc', name: 'Float: High to Low' },
  ];

  const handleGameChange = (gameId: string) => {
    onFilterChange({
      ...filters,
      game: filters.game === gameId ? undefined : gameId,
    });
  };

  const handleRarityChange = (rarityId: string) => {
    const currentRarities = filters.rarity || [];
    if (currentRarities.includes(rarityId)) {
      onFilterChange({
        ...filters,
        rarity: currentRarities.filter(r => r !== rarityId),
      });
    } else {
      onFilterChange({
        ...filters,
        rarity: [...currentRarities, rarityId],
      });
    }
  };

  const handleWearChange = (wearId: string) => {
    const currentWears = filters.wear || [];
    if (currentWears.includes(wearId)) {
      onFilterChange({
        ...filters,
        wear: currentWears.filter(w => w !== wearId),
      });
    } else {
      onFilterChange({
        ...filters,
        wear: [...currentWears, wearId],
      });
    }
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    onFilterChange({
      ...filters,
      [type === 'min' ? 'minPrice' : 'maxPrice']: numValue,
    });
  };

  const handleFloatChange = (type: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    onFilterChange({
      ...filters,
      [type === 'min' ? 'minFloat' : 'maxFloat']: numValue,
    });
  };

  const handleSearchChange = (value: string) => {
    onFilterChange({
      ...filters,
      search: value || undefined,
    });
  };

  const handleSortChange = (sortId: string) => {
    onFilterChange({
      ...filters,
      sort: sortId,
    });
  };

  const clearFilters = () => {
    onFilterChange({});
    onClear();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.game) count++;
    if (filters.rarity?.length) count++;
    if (filters.wear?.length) count++;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++;
    if (filters.minFloat !== undefined || filters.maxFloat !== undefined) count++;
    if (filters.search) count++;
    return count;
  };

  return (
    <div className={`bg-gray-800 border-r border-gray-700 w-64 flex-shrink-0 ${className}`}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
          Filters
        </h2>
        <div className="flex items-center space-x-2">
          {getActiveFiltersCount() > 0 && (
            <Badge variant="orange" size="sm">
              {getActiveFiltersCount()} active
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-400 hover:text-white"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-6">
          {/* Game Filter */}
          <div>
            <Disclosure defaultOpen={true}>
              {({ open }) => (
                <>
                  <Disclosure.Button className="flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600">
                    <span>Game</span>
                    {open ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-4 pt-4 pb-2">
                    <div className="grid grid-cols-2 gap-2">
                      {games.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => handleGameChange(game.id)}
                          className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                            filters.game === game.id
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                          }`}
                        >
                          {game.icon}
                        </button>
                      ))}
                    </div>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </div>

          {/* Rarity Filter */}
          <div>
            <Disclosure defaultOpen={true}>
              {({ open }) => (
                <>
                  <Disclosure.Button className="flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600">
                    <span>Rarity</span>
                    {open ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-4 pt-4 pb-2">
                    <div className="space-y-2">
                      {rarities.map((rarity) => (
                        <label key={rarity.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={(filters.rarity || []).includes(rarity.id)}
                            onChange={() => handleRarityChange(rarity.id)}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 mr-2"
                          />
                          <Badge variant={rarity.color} size="sm">
                            {rarity.name}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </div>

          {/* CS2 Wear Filter (only show if CS2 is selected) */}
          {filters.game === '730' && (
            <div>
              <Disclosure defaultOpen={true}>
                {({ open }) => (
                  <>
                    <Disclosure.Button className="flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600">
                      <span>Wear</span>
                      {open ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </Disclosure.Button>
                    <Disclosure.Panel className="px-4 pt-4 pb-2">
                      <div className="space-y-2">
                        {wears.map((wear) => (
                          <label key={wear.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={(filters.wear || []).includes(wear.id)}
                              onChange={() => handleWearChange(wear.id)}
                              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 mr-2"
                            />
                            <span className="text-gray-300 text-sm">
                              {wear.name} ({wear.abbreviation})
                            </span>
                          </label>
                        ))}
                      </div>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            </div>
          )}

          {/* Price Range Filter */}
          <div>
            <Disclosure defaultOpen={true}>
              {({ open }) => (
                <>
                  <Disclosure.Button className="flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600">
                    <span>Price Range</span>
                    {open ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-4 pt-4 pb-2">
                    <div className="space-y-3">
                      <Input
                        type="number"
                        placeholder="Min price"
                        value={filters.minPrice || ''}
                        onChange={(e) => handlePriceChange('min', e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <Input
                        type="number"
                        placeholder="Max price"
                        value={filters.maxPrice || ''}
                        onChange={(e) => handlePriceChange('max', e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </div>

          {/* Float Range Filter (only for CS2) */}
          {filters.game === '730' && (
            <div>
              <Disclosure defaultOpen={true}>
                {({ open }) => (
                  <>
                    <Disclosure.Button className="flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600">
                      <span>Float Range</span>
                      {open ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </Disclosure.Button>
                    <Disclosure.Panel className="px-4 pt-4 pb-2">
                      <div className="space-y-3">
                        <Input
                          type="number"
                          placeholder="Min float (0.000)"
                          value={filters.minFloat || ''}
                          onChange={(e) => handleFloatChange('min', e.target.value)}
                          min="0"
                          max="1"
                          step="0.001"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                        <Input
                          type="number"
                          placeholder="Max float (1.000)"
                          value={filters.maxFloat || ''}
                          onChange={(e) => handleFloatChange('max', e.target.value)}
                          min="0"
                          max="1"
                          step="0.001"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            </div>
          )}

          {/* Search Filter */}
          <div>
            <Disclosure defaultOpen={true}>
              {({ open }) => (
                <>
                  <Disclosure.Button className="flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600">
                    <span>Search</span>
                    {open ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-4 pt-4 pb-2">
                    <Input
                      type="text"
                      placeholder="Item name..."
                      value={filters.search || ''}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </div>

          {/* Sort Filter */}
          <div>
            <Disclosure defaultOpen={true}>
              {({ open }) => (
                <>
                  <Disclosure.Button className="flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600">
                    <span>Sort By</span>
                    {open ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-4 pt-4 pb-2">
                    <div className="space-y-2">
                      {sorts.map((sort) => (
                        <label key={sort.id} className="flex items-center">
                          <input
                            type="radio"
                            name="sort"
                            checked={filters.sort === sort.id}
                            onChange={() => handleSortChange(sort.id)}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 mr-2"
                          />
                          <span className="text-gray-300 text-sm">{sort.name}</span>
                        </label>
                      ))}
                    </div>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </div>
        </div>
      </div>
    </div>
  );
}