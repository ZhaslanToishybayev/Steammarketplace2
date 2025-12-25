// Rarity type definition
export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythical' | 'legendary' | 'ancient';

// Rarity configuration interface
export interface RarityConfig {
  label: string;
  color: string;
  glowColor: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  icon?: React.ReactNode;
  sortOrder: number;
  emoji?: string;
}

// Rarity configurations
export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  common: {
    label: 'Common',
    color: 'rarity-common-600',
    glowColor: 'shadow-glow-common',
    borderColor: 'border-rarity-common-500',
    bgColor: 'bg-rarity-common-600',
    textColor: 'text-rarity-common-100',
    sortOrder: 0,
    emoji: '⚪',
  },
  uncommon: {
    label: 'Uncommon',
    color: 'rarity-uncommon-600',
    glowColor: 'shadow-glow-uncommon',
    borderColor: 'border-rarity-uncommon-500',
    bgColor: 'bg-rarity-uncommon-600',
    textColor: 'text-rarity-uncommon-100',
    sortOrder: 1,
    emoji: '🟢',
  },
  rare: {
    label: 'Rare',
    color: 'rarity-rare-600',
    glowColor: 'shadow-glow-rare',
    borderColor: 'border-rarity-rare-500',
    bgColor: 'bg-rarity-rare-600',
    textColor: 'text-rarity-rare-100',
    sortOrder: 2,
    emoji: '🔵',
  },
  mythical: {
    label: 'Mythical',
    color: 'rarity-mythical-600',
    glowColor: 'shadow-glow-mythical',
    borderColor: 'border-rarity-mythical-500',
    bgColor: 'bg-rarity-mythical-600',
    textColor: 'text-rarity-mythical-100',
    sortOrder: 3,
    emoji: '🟣',
  },
  legendary: {
    label: 'Legendary',
    color: 'rarity-legendary-600',
    glowColor: 'shadow-glow-legendary',
    borderColor: 'border-rarity-legendary-500',
    bgColor: 'bg-rarity-legendary-600',
    textColor: 'text-rarity-legendary-100',
    sortOrder: 4,
    emoji: '🟠',
  },
  ancient: {
    label: 'Ancient',
    color: 'rarity-ancient-600',
    glowColor: 'shadow-glow-ancient',
    borderColor: 'border-rarity-ancient-500',
    bgColor: 'bg-rarity-ancient-600',
    textColor: 'text-rarity-ancient-100',
    sortOrder: 5,
    emoji: '🔴',
  },
};

// Rarity order array
export const RARITY_ORDER: Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'mythical',
  'legendary',
  'ancient',
];

// Rarity color hex codes
export const RARITY_COLORS = {
  common: '#4B5563',
  uncommon: '#16A34A',
  rare: '#2563EB',
  mythical: '#7C3AED',
  legendary: '#EA580C',
  ancient: '#DC2626',
} as const;

// Rarity labels
export const RARITY_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  mythical: 'Mythical',
  legendary: 'Legendary',
  ancient: 'Ancient',
} as const;

// Rarity emojis
export const RARITY_EMOJIS = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  mythical: '🟣',
  legendary: '🟠',
  ancient: '🔴',
} as const;

// Helper functions

/**
 * Get rarity configuration for a given rarity string
 */
export function getRarityConfig(rarity: string): RarityConfig {
  const normalizedRarity = rarity.toLowerCase() as Rarity;
  return RARITY_CONFIG[normalizedRarity] || RARITY_CONFIG.common;
}

/**
 * Get Tailwind color class for a rarity
 */
export function getRarityColor(rarity: string): string {
  return getRarityConfig(rarity).color;
}

/**
 * Get Tailwind glow shadow class for a rarity
 */
export function getRarityGlow(rarity: string): string {
  return getRarityConfig(rarity).glowColor;
}

/**
 * Get Tailwind badge variant for a rarity
 */
export function getRarityBadgeVariant(rarity: string): string {
  const normalizedRarity = rarity.toLowerCase() as Rarity;
  return RARITY_ORDER.includes(normalizedRarity) ? normalizedRarity : 'common';
}

/**
 * Get rarity emoji
 */
export function getRarityEmoji(rarity: string): string {
  const normalizedRarity = rarity.toLowerCase() as Rarity;
  return RARITY_EMOJIS[normalizedRarity] || RARITY_EMOJIS.common;
}

/**
 * Get rarity gradient CSS class
 */
export function getRarityGradient(rarity: string): string {
  const normalizedRarity = rarity.toLowerCase() as Rarity;
  return `gradient-rarity-${normalizedRarity}`;
}

/**
 * Compare two rarities for sorting
 */
export function compareRarity(a: string, b: string): number {
  const rarityA = a.toLowerCase() as Rarity;
  const rarityB = b.toLowerCase() as Rarity;

  const orderA = RARITY_CONFIG[rarityA]?.sortOrder ?? 0;
  const orderB = RARITY_CONFIG[rarityB]?.sortOrder ?? 0;

  return orderB - orderA; // Descending order (higher rarity first)
}

/**
 * Check if rarity A is higher than rarity B
 */
export function isRarityHigher(a: string, b: string): boolean {
  return compareRarity(a, b) > 0;
}

/**
 * Get numeric tier for a rarity (0-5)
 */
export function getRarityTier(rarity: string): number {
  return getRarityConfig(rarity).sortOrder;
}

/**
 * Format rarity for display
 */
export function formatRarity(rarity: string): string {
  return getRarityConfig(rarity).label;
}

/**
 * Get all rarity values
 */
export function getAllRarities(): Rarity[] {
  return [...RARITY_ORDER];
}

/**
 * Check if a string is a valid rarity
 */
export function isValidRarity(rarity: string): boolean {
  return RARITY_ORDER.includes(rarity.toLowerCase() as Rarity);
}

/**
 * Get rarity by tier number (0-5)
 */
export function getRarityByTier(tier: number): Rarity {
  return RARITY_ORDER[tier] || 'common';
}

/**
 * Get next higher rarity
 */
export function getNextHigherRarity(currentRarity: Rarity): Rarity | null {
  const currentIndex = RARITY_ORDER.indexOf(currentRarity);
  return currentIndex < RARITY_ORDER.length - 1 ? RARITY_ORDER[currentIndex + 1] : null;
}

/**
 * Get previous lower rarity
 */
export function getPreviousLowerRarity(currentRarity: Rarity): Rarity | null {
  const currentIndex = RARITY_ORDER.indexOf(currentRarity);
  return currentIndex > 0 ? RARITY_ORDER[currentIndex - 1] : null;
}

/**
 * Get rarity display info with all properties
 */
export function getRarityDisplayInfo(rarity: string): {
  label: string;
  emoji: string;
  color: string;
  glow: string;
  gradient: string;
  tier: number;
} {
  const config = getRarityConfig(rarity);
  return {
    label: config.label,
    emoji: getRarityEmoji(rarity),
    color: config.color,
    glow: config.glowColor,
    gradient: getRarityGradient(rarity),
    tier: config.sortOrder,
  };
}

/**
 * Create a rarity filter function
 */
export function createRarityFilter(rarities: string[]): (itemRarity: string) => boolean {
  const normalizedRarities = rarities.map(r => r.toLowerCase());
  return (itemRarity: string) => normalizedRarities.includes(itemRarity.toLowerCase());
}

/**
 * Sort items by rarity
 */
export function sortItemsByRarity<T extends { rarity: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareRarity(a.rarity, b.rarity));
}

/**
 * Group items by rarity
 */
export function groupItemsByRarity<T extends { rarity: string }>(items: T[]): Record<Rarity, T[]> {
  return items.reduce((groups, item) => {
    const rarity = item.rarity.toLowerCase() as Rarity;
    if (!RARITY_ORDER.includes(rarity)) return groups;

    if (!groups[rarity]) {
      groups[rarity] = [];
    }
    groups[rarity].push(item);
    return groups;
  }, {} as Record<Rarity, T[]>);
}