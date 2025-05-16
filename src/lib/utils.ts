import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if all items in a collection match a certain condition
 * @param items The array of items to check
 * @param predicate The condition to check against each item
 * @returns True if all items match the predicate, false otherwise
 */
export function all<T>(items: T[], predicate: (item: T) => boolean): boolean {
  return items.every(predicate);
}
