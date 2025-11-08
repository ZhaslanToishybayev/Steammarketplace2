import { useState } from 'react';
import { ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to High', field: 'price', order: 'asc' },
  { value: 'price_desc', label: 'Price: High to Low', field: 'price', order: 'desc' },
  { value: 'float_asc', label: 'Float: Low to High', field: 'float', order: 'asc' },
  { value: 'float_desc', label: 'Float: High to Low', field: 'float', order: 'desc' },
  { value: 'newest', label: 'Newest First', field: 'createdAt', order: 'desc' },
  { value: 'oldest', label: 'Oldest First', field: 'createdAt', order: 'asc' },
  { value: 'rarity_desc', label: 'Rarity: High to Low', field: 'rarity', order: 'desc' },
  { value: 'name_asc', label: 'Name: A to Z', field: 'name', order: 'asc' },
  { value: 'name_desc', label: 'Name: Z to A', field: 'name', order: 'desc' },
];

export default function SortDropdown({ sortBy, onSortChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const currentSort = SORT_OPTIONS.find((opt) => opt.value === sortBy) || SORT_OPTIONS[0];

  const getSortIcon = (option) => {
    if (option.field === 'price') {
      return option.order === 'asc' ? (
        <ArrowUp className="w-4 h-4" />
      ) : (
        <ArrowDown className="w-4 h-4" />
      );
    }
    return <ArrowUpDown className="w-4 h-4" />;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
      >
        <ArrowUpDown className="w-4 h-4" />
        <span className="text-sm text-dark-300">Sort by:</span>
        <span className="text-sm font-medium text-white">{currentSort.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="py-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                    sortBy === option.value
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-300 hover:bg-dark-700'
                  }`}
                >
                  <span>{option.label}</span>
                  {getSortIcon(option)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
