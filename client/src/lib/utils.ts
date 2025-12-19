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

// Utility function to format numbers with thousand separators using "'"
export function formatNumber(num: number | string): string {
  // Convert to number if string
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  // Handle invalid numbers
  if (isNaN(numValue)) return String(num);
  
  // Split into integer and decimal parts
  const parts = numValue.toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add thousand separators to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  
  // Return with decimal part if it exists
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}