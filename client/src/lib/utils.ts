import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import i18n from "@/i18n"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Active BCP-47 locale for Intl formatters (maps zh-CN → zh-Hans). */
export function getIntlLocale(): string {
  const lng = i18n.language ?? "en";
  if (lng === "zh-CN") return "zh-Hans";
  return lng;
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

// Utility function to format numbers with thousands separator (locale-aware)
export function formatNumber(value: number): string {
  try {
    return new Intl.NumberFormat(getIntlLocale()).format(value);
  } catch {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }
}

export function formatSignedNumber(value: number): string {
  const formatted = formatNumber(value);
  return value > 0 ? `+${formatted}` : formatted;
}

export function formatSaveTimestamp(): string {
  const now = new Date();
  return now.toLocaleString(getIntlLocale(), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: getIntlLocale().startsWith('en'),
  });
}

/** Format price in cents for display (currency separate from UI locale). */
export function formatPrice(cents: number, currency: "EUR" | "USD"): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(getIntlLocale(), {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const formatted = amount.toFixed(2);
    return currency === "EUR" ? `${formatted} €` : `$${formatted}`;
  }
}

/** Format duration in milliseconds as HH:MM:SS */
export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/** Format minutes as "2h 30m" style string */
export function formatMinutesDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}