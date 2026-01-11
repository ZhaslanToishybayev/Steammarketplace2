import { format, formatDistanceToNow, formatDistance } from 'date-fns';

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number, options?: { decimals?: number; compact?: boolean }): string => {
  const { decimals = 2, compact = false } = options || {};

  if (compact && num >= 1000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: decimals,
    }).format(num);
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatDate = (
  date: Date | string | number,
  formatStr: string = 'MMM d, yyyy'
): string => {
  try {
    return format(new Date(date), formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export const formatTime = (date: Date | string | number): string => {
  return format(new Date(date), 'HH:mm');
};

export const formatDateTime = (date: Date | string | number): string => {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
};

export const formatRelativeTime = (date: Date | string | number): string => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatFloat = (float: number, decimals: number = 6): string => {
  return float.toFixed(decimals);
};

export const formatSteamId = (steamId: string): string => {
  // Format Steam64ID to show last 8 characters
  if (steamId.length === 17) {
    return `******${steamId.slice(-8)}`;
  }
  return steamId;
};

export const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

export const formatTradeStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    sent: 'Sent',
    accepted: 'Accepted',
    declined: 'Declined',
    cancelled: 'Cancelled',
    completed: 'Completed',
    expired: 'Expired',
  };

  return statusMap[status.toLowerCase()] || status;
};

export const formatGameName = (gameId: string): string => {
  const gameMap: Record<string, string> = {
    '730': 'Counter-Strike 2',
    '570': 'Dota 2',
    '440': 'Team Fortress 2',
    '252490': 'Rust',
    '578080': 'PUBG: Battlegrounds',
  };

  return gameMap[gameId] || `Game ${gameId}`;
};

export const formatWear = (wear: string): string => {
  const wearMap: Record<string, string> = {
    'factory new': 'Factory New (FN)',
    'minimal wear': 'Minimal Wear (MW)',
    'field-tested': 'Field-Tested (FT)',
    'well-worn': 'Well-Worn (WW)',
    'battle-scarred': 'Battle-Scarred (BS)',
  };

  return wearMap[wear.toLowerCase()] || wear;
};

export const formatRarity = (rarity: string): string => {
  const rarityMap: Record<string, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    mythical: 'Mythical',
    legendary: 'Legendary',
    ancient: 'Ancient',
    immortal: 'Immortal',
  };

  return rarityMap[rarity.toLowerCase()] || rarity;
};

export const formatBytes = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};