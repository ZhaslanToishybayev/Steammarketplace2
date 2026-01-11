'use client';

import { useState } from 'react';
import { Input, Button, Badge } from './ui';

interface AdvancedFiltersProps {
    onFiltersChange: (filters: FilterState) => void;
    initialFilters?: Partial<FilterState>;
}

export interface FilterState {
    search: string;
    appId?: number;
    minPrice?: number;
    maxPrice?: number;
    minFloat?: number;
    maxFloat?: number;
    hasStickers: boolean;
    dopplerPhase?: string;
    minFade?: number;
    specificSticker?: string;
    minStickerValue?: number;
    exterior?: string;
    rarity?: string;
}

const GAMES = [
    { id: 730, name: 'CS2', icon: '🎯' },
    { id: 570, name: 'Dota 2', icon: '⚔️' },
    { id: 440, name: 'TF2', icon: '🎩' },
];

const DOPPLER_PHASES = [
    'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4',
    'Ruby', 'Sapphire', 'Black Pearl', 'Emerald',
];

const EXTERIORS = [
    { value: 'fn', label: 'Factory New' },
    { value: 'mw', label: 'Minimal Wear' },
    { value: 'ft', label: 'Field-Tested' },
    { value: 'ww', label: 'Well-Worn' },
    { value: 'bs', label: 'Battle-Scarred' },
];

const RARITIES = [
    { value: 'consumer', label: 'Consumer', color: 'var(--rarity-consumer)' },
    { value: 'industrial', label: 'Industrial', color: 'var(--rarity-industrial)' },
    { value: 'milspec', label: 'Mil-Spec', color: 'var(--rarity-milspec)' },
    { value: 'restricted', label: 'Restricted', color: 'var(--rarity-restricted)' },
    { value: 'classified', label: 'Classified', color: 'var(--rarity-classified)' },
    { value: 'covert', label: 'Covert', color: 'var(--rarity-covert)' },
];

const DEFAULT_FILTERS: FilterState = {
    search: '',
    hasStickers: false,
};

export function AdvancedFilters({ onFiltersChange, initialFilters }: AdvancedFiltersProps) {
    const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters });
    const [isExpanded, setIsExpanded] = useState(false);

    const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFiltersChange(newFilters);
    };

    const clearFilters = () => {
        setFilters(DEFAULT_FILTERS);
        onFiltersChange(DEFAULT_FILTERS);
    };

    const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
        if (key === 'search' && !value) return false;
        if (key === 'hasStickers' && !value) return false;
        if (value === undefined || value === null || value === '') return false;
        return true;
    }).length;

    return (
        <div className="card p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">Filters</h3>
                    {activeFiltersCount > 0 && (
                        <Badge variant="blue">{activeFiltersCount}</Badge>
                    )}
                </div>
                <div className="flex gap-2">
                    {activeFiltersCount > 0 && (
                        <Button size="sm" variant="ghost" onClick={clearFilters}>
                            Clear
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? 'Less' : 'More'}
                    </Button>
                </div>
            </div>

            {/* Basic Filters (always visible) */}
            <div className="space-y-4">
                {/* Game Filter */}
                <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">Game</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => updateFilter('appId', undefined)}
                            className={`btn btn-sm ${!filters.appId ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            All
                        </button>
                        {GAMES.map((game) => (
                            <button
                                key={game.id}
                                onClick={() => updateFilter('appId', game.id)}
                                className={`btn btn-sm ${filters.appId === game.id ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                {game.icon} {game.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price Range */}
                <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">Price Range</label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Min $"
                            value={filters.minPrice || ''}
                            onChange={(e) => updateFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                        />
                        <Input
                            type="number"
                            placeholder="Max $"
                            value={filters.maxPrice || ''}
                            onChange={(e) => updateFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                        />
                    </div>
                </div>

                {/* Float Range */}
                <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">Float Range</label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            max="1"
                            value={filters.minFloat || ''}
                            onChange={(e) => updateFilter('minFloat', e.target.value ? Number(e.target.value) : undefined)}
                        />
                        <Input
                            type="number"
                            placeholder="1.00"
                            step="0.01"
                            min="0"
                            max="1"
                            value={filters.maxFloat || ''}
                            onChange={(e) => updateFilter('maxFloat', e.target.value ? Number(e.target.value) : undefined)}
                        />
                    </div>
                </div>
            </div>

            {/* Advanced Filters (expandable) */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[var(--border-default)] space-y-4">
                    {/* Doppler Phase */}
                    <div>
                        <label className="text-sm text-[var(--text-secondary)] mb-2 block">Doppler Phase</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => updateFilter('dopplerPhase', undefined)}
                                className={`btn btn-sm ${!filters.dopplerPhase ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                Any
                            </button>
                            {DOPPLER_PHASES.map((phase) => (
                                <button
                                    key={phase}
                                    onClick={() => updateFilter('dopplerPhase', phase)}
                                    className={`btn btn-sm ${filters.dopplerPhase === phase ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {phase}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fade Percentage */}
                    <div>
                        <label className="text-sm text-[var(--text-secondary)] mb-2 block">Min Fade %</label>
                        <div className="flex gap-2">
                            {[90, 95, 98, 100].map((percent) => (
                                <button
                                    key={percent}
                                    onClick={() => updateFilter('minFade', filters.minFade === percent ? undefined : percent)}
                                    className={`btn btn-sm ${filters.minFade === percent ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {percent}%+
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stickers */}
                    <div>
                        <label className="text-sm text-[var(--text-secondary)] mb-2 block">Stickers</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.hasStickers}
                                    onChange={(e) => updateFilter('hasStickers', e.target.checked)}
                                    className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-tertiary)]"
                                />
                                <span className="text-sm text-white">Has Stickers</span>
                            </label>
                            <Input
                                placeholder="Search sticker name..."
                                value={filters.specificSticker || ''}
                                onChange={(e) => updateFilter('specificSticker', e.target.value || undefined)}
                            />
                            <Input
                                type="number"
                                placeholder="Min sticker value $"
                                value={filters.minStickerValue || ''}
                                onChange={(e) => updateFilter('minStickerValue', e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </div>
                    </div>

                    {/* Exterior */}
                    <div>
                        <label className="text-sm text-[var(--text-secondary)] mb-2 block">Exterior</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => updateFilter('exterior', undefined)}
                                className={`btn btn-sm ${!filters.exterior ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                Any
                            </button>
                            {EXTERIORS.map((ext) => (
                                <button
                                    key={ext.value}
                                    onClick={() => updateFilter('exterior', ext.value)}
                                    className={`btn btn-sm ${filters.exterior === ext.value ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {ext.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rarity */}
                    <div>
                        <label className="text-sm text-[var(--text-secondary)] mb-2 block">Rarity</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => updateFilter('rarity', undefined)}
                                className={`btn btn-sm ${!filters.rarity ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                Any
                            </button>
                            {RARITIES.map((rarity) => (
                                <button
                                    key={rarity.value}
                                    onClick={() => updateFilter('rarity', rarity.value)}
                                    className="btn btn-sm"
                                    style={{
                                        backgroundColor: filters.rarity === rarity.value ? rarity.color : 'var(--bg-tertiary)',
                                        color: filters.rarity === rarity.value ? 'white' : 'var(--text-secondary)',
                                        borderColor: rarity.color,
                                        borderWidth: '1px',
                                    }}
                                >
                                    {rarity.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
