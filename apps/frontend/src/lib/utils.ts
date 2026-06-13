import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility to merge Tailwind classes with proper conflict resolution
 * Used by shadcn/ui components
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
