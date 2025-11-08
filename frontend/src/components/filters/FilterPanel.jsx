import { useState } from 'react';
import { Filter, X, ChevronDown, Star } from 'lucide-react';

const GAMES = [
  { value: '', label: 'All Games' },
  { value: 'cs2', label: 'CS2' },
  { value: 'csgo', label: 'CS:GO' },
  { value: 'dota2', label: 'Dota 2' },
  { value: 'rust', label: 'Rust' },
];

const WEAPONS = [
  { value: '', label: 'All Weapons' },
  { value: 'knife', label: 'Knives' },
  { value: 'gloves', label: 'Gloves' },
  { value: 'rifle', label: 'Rifles' },
  { value: 'pistol', label: 'Pistols' },
  { value: 'smg', label: 'SMGs' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'shotgun', label: 'Shotguns' },
  { value: 'sniper', label: 'Sniper Rifles' },
  { value: 'melee', label: 'Melee' },
];

const RARITIES = [
  { value: '', label: 'All Rarities' },
  { value: 'Consumer Grade', label: 'Consumer Grade' },
  { value: 'Industrial Grade', label: 'Industrial Grade' },
  { value: 'Mil-Spec Grade', label: 'Mil-Spec Grade' },
  { value: 'Restricted', label: 'Restricted' },
  { value: 'Classified', label: 'Classified' },
  { value: 'Covert', label: 'Covert' },
  { value: 'Contraband', label: 'Contraband' },
  { value: 'Covert Knife', label: 'Covert Knife' },
  { value: 'Contraband Knife', label: 'Contraband Knife' },
  { value: 'Rare Special', label: 'Rare Special' },
];

const EXTERIORS = [
  { value: '', label: 'All Conditions' },
  { value: 'Factory New', label: 'Factory New (FN)' },
  { value: 'Minimal Wear', label: 'Minimal Wear (MW)' },
  { value: 'Field-Tested', label: 'Field-Tested (FT)' },
  { value: 'Well-Worn', label: 'Well-Worn (WW)' },
  { value: 'Battle-Scarred', label: 'Battle-Scarred (BS)' },
];

const STICKER_COUNTS = [
  { value: '', label: 'Any' },
  { value: '0', label: '0 Stickers' },
  { value: '1', label: '1 Sticker' },
  { value: '2', label: '2 Stickers' },
  { value: '3', label: '3 Stickers' },
  { value: '4', label: '4 Stickers' },
];

export default function FilterPanel({ filters, onFilterChange, onClearFilters }) {
  const [isOpen, setIsOpen] = useState(true);
  const [floatRange, setFloatRange] = useState([
    filters.minFloat || 0,
    filters.maxFloat || 1,
  ]);

  const handleFloatChange = (index, value) => {
    const newRange = [...floatRange];
    newRange[index] = value;
    setFloatRange(newRange);
    onFilterChange('minFloat', newRange[0]);
    onFilterChange('maxFloat', newRange[1]);
  };

  const hasActiveFilters = () => {
    return (
      filters.game ||
      filters.weapon ||
      filters.rarity ||
      filters.exterior ||
      filters.stattrak ||
      filters.stickers ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.minFloat !== undefined ||
      filters.maxFloat !== undefined ||
      filters.search
    );
  };

  return (
    <div className="card mb-8">
      <div
        className="flex items-center justify-between cursor-pointer mb-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold">Filters</h2>
          {hasActiveFilters() && (
            <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters() && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearFilters();
                setFloatRange([0, 1]);
              }}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search skins, collections, or patterns..."
              className="input w-full"
              value={filters.search || ''}
              onChange={(e) => onFilterChange('search', e.target.value)}
            />
          </div>

          {/* Game Selection */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Game
            </label>
            <div className="flex gap-2 flex-wrap">
              {GAMES.map((game) => (
                <button
                  key={game.value}
                  onClick={() => onFilterChange('game', game.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.game === game.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}
                >
                  {game.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weapon Type */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Weapon Type
              </label>
              <select
                className="input w-full"
                value={filters.weapon || ''}
                onChange={(e) => onFilterChange('weapon', e.target.value)}
              >
                {WEAPONS.map((weapon) => (
                  <option key={weapon.value} value={weapon.value}>
                    {weapon.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Condition (Exterior)
              </label>
              <select
                className="input w-full"
                value={filters.exterior || ''}
                onChange={(e) => onFilterChange('exterior', e.target.value)}
              >
                {EXTERIORS.map((ext) => (
                  <option key={ext.value} value={ext.value}>
                    {ext.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rarity */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Rarity
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {RARITIES.map((rarity) => (
                <button
                  key={rarity.value}
                  onClick={() => onFilterChange('rarity', rarity.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    filters.rarity === rarity.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}
                >
                  {rarity.label}
                </button>
              ))}
            </div>
          </div>

          {/* Float Range Slider */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Float Range: {floatRange[0].toFixed(3)} - {floatRange[1].toFixed(3)}
            </label>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-dark-400">Min Float</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={floatRange[0]}
                  onChange={(e) => handleFloatChange(0, parseFloat(e.target.value))}
                  className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              <div>
                <label className="text-xs text-dark-400">Max Float</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={floatRange[1]}
                  onChange={(e) => handleFloatChange(1, parseFloat(e.target.value))}
                  className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          </div>

          {/* StatTrak and Stickers */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-600 focus:ring-primary-500"
                  checked={filters.stattrak || false}
                  onChange={(e) => onFilterChange('stattrak', e.target.checked)}
                />
                <span className="text-dark-300 font-medium">StatTrak™ Only</span>
                <span className="bg-orange-500 text-black text-xs px-2 py-1 rounded font-bold">
                  ST
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Sticker Count
              </label>
              <select
                className="input w-full"
                value={filters.stickers || ''}
                onChange={(e) => onFilterChange('stickers', e.target.value)}
              >
                {STICKER_COUNTS.map((count) => (
                  <option key={count.value} value={count.value}>
                    {count.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Price Range (USD)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  placeholder="Min Price"
                  className="input w-full"
                  value={filters.minPrice || ''}
                  onChange={(e) => onFilterChange('minPrice', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max Price"
                  className="input w-full"
                  value={filters.maxPrice || ''}
                  onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
