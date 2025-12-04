// GroveUI - Class Name Utility
//
// Combines clsx and tailwind-merge for conditional class names
// with automatic Tailwind conflict resolution.
//
// Usage:
//   import { cn } from '@groveengine/ui/utils';
//   <div class={cn('p-4 bg-white', isActive && 'bg-grove-100', className)} />

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names with Tailwind CSS conflict resolution.
 *
 * @param inputs - Class values to combine (strings, arrays, objects)
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4' (px-4 wins)
 * cn('text-red-500', isBlue && 'text-blue-500')
 * cn({ 'bg-white': light, 'bg-black': dark })
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
