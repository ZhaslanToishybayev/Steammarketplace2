import { z } from 'zod';

// Steam Trade URL validation
export const validateTradeUrl = (url: string): boolean => {
  const steamTradeUrlRegex =
    /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+$/;
  return steamTradeUrlRegex.test(url);
};

// Steam ID validation
export const validateSteamId = (steamId: string): boolean => {
  // Steam64ID validation (17 digits)
  const steam64IdRegex = /^\d{17}$/;
  return steam64IdRegex.test(steamId);
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Price validation
export const validatePrice = (price: number): boolean => {
  return typeof price === 'number' && price >= 0 && !isNaN(price);
};

// Username validation
export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,32}$/;
  return usernameRegex.test(username);
};

// Password validation
export const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Color hex code validation
export const validateHexColor = (color: string): boolean => {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
};

// URL validation
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// File size validation (in bytes)
export const validateFileSize = (size: number, maxSize: number): boolean => {
  return size <= maxSize;
};

// File type validation
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

// Zod schemas for form validation
export const tradeUrlSchema = z
  .string()
  .min(1, 'Trade URL is required')
  .refine(validateTradeUrl, 'Please enter a valid Steam trade URL');

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username cannot exceed 32 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Please enter a valid email address'),
  tradeUrl: z.string().optional().refine((val) => !val || validateTradeUrl(val), {
    message: 'Please enter a valid Steam trade URL',
  }),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
});

export const filterSchema = z.object({
  gameId: z.string().optional(),
  rarity: z.array(z.string()).optional(),
  wear: z.array(z.string()).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minFloat: z.number().min(0).max(1).optional(),
  maxFloat: z.number().min(0).max(1).optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
});

export const createTradeSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
  })).min(1, 'At least one item must be selected'),
  tradeUrl: z.string().refine(validateTradeUrl, 'Please enter a valid Steam trade URL'),
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
});

export const depositSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Please select a payment method'),
});

export const withdrawSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  walletAddress: z.string().min(1, 'Wallet address is required'),
  paymentMethod: z.string().min(1, 'Please select a payment method'),
});

export const transferSchema = z.object({
  toUserId: z.string().min(1, 'Recipient is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  message: z.string().max(200, 'Message cannot exceed 200 characters').optional(),
});

export const settingsSchema = z.object({
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    tradeUpdates: z.boolean(),
    priceAlerts: z.boolean(),
  }),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private']),
    tradeOffers: z.enum(['everyone', 'friends', 'disabled']),
    inventoryVisibility: z.enum(['public', 'friends', 'private']),
  }),
  display: z.object({
    theme: z.enum(['dark', 'light', 'system']),
    currency: z.string().length(3),
    compactMode: z.boolean(),
  }),
});

// Validation utilities
export const validateForm = <T>(schema: z.ZodSchema<T>, data: any) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.format(),
    };
  }
  return {
    success: true,
    data: result.data,
  };
};

export const getFormError = (errors: any, field: string): string => {
  const fieldErrors = errors?.[field];
  if (fieldErrors?._errors?.length) {
    return fieldErrors._errors[0];
  }
  return '';
};

// Complex validation functions
export const validateTradeOffer = (offer: {
  items: any[];
  tradeUrl: string;
  message?: string;
}) => {
  const errors: string[] = [];

  if (!offer.items.length) {
    errors.push('At least one item must be selected');
  }

  if (!validateTradeUrl(offer.tradeUrl)) {
    errors.push('Invalid trade URL');
  }

  if (offer.message && offer.message.length > 500) {
    errors.push('Message cannot exceed 500 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePriceRange = (minPrice?: number, maxPrice?: number) => {
  if (minPrice !== undefined && maxPrice !== undefined) {
    if (minPrice >= maxPrice) {
      return 'Minimum price must be less than maximum price';
    }
  }
  return null;
};

export const validateFloatRange = (minFloat?: number, maxFloat?: number) => {
  if (minFloat !== undefined && maxFloat !== undefined) {
    if (minFloat < 0 || minFloat > 1) {
      return 'Minimum float must be between 0 and 1';
    }
    if (maxFloat < 0 || maxFloat > 1) {
      return 'Maximum float must be between 0 and 1';
    }
    if (minFloat >= maxFloat) {
      return 'Minimum float must be less than maximum float';
    }
  }
  return null;
};