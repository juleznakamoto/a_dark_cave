import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to capitalize first letter of each word and convert camelCase/snake_case to spaced words
export function capitalizeWords(str: string): string {
  // Convert camelCase to spaced words, then handle snake_case, then capitalize each word
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters (camelCase)
    .split('_') // Handle snake_case
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}