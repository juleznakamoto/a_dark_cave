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

const THOUSANDS_SEPARATOR = "'";

/** Group integer digits with `'` (same in every UI language). */
function groupIntegerDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
}

/** Format numbers with `'` as thousands separator (all UI locales). */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);

  const negative = value < 0;
  const abs = Math.abs(value);
  const sign = negative ? "-" : "";
  const [intPart, decPart] = abs.toString().split(".");
  const grouped = groupIntegerDigits(intPart);
  return decPart != null ? `${sign}${grouped}.${decPart}` : `${sign}${grouped}`;
}

export function formatSignedNumber(value: number): string {
  const formatted = formatNumber(value);
  return value > 0 ? `+${formatted}` : formatted;
}

/** Add `'` thousands separators to bare integer runs in log text (display-time). */
export function formatThousandsInLogText(text: string): string {
  return text.replace(
    /([+-]?)(\d{4,})(?!\d)/g,
    (_match, sign: string, digits: string) => `${sign}${groupIntegerDigits(digits)}`,
  );
}

/** Abbreviate large magnitudes for compact UI (e.g. side-panel change column). */
export function abbreviateNumber(num: number): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absNum >= 1_000_000_000) {
    return (
      sign +
      (absNum / 1_000_000_000).toFixed(1).replace(/\.0$/, "").replace(".", THOUSANDS_SEPARATOR) +
      "B"
    );
  }
  if (absNum >= 1_000_000) {
    return (
      sign +
      (absNum / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", THOUSANDS_SEPARATOR) +
      "M"
    );
  }
  if (absNum >= 1000) {
    return (
      sign +
      (absNum / 1000).toFixed(1).replace(/\.0$/, "").replace(".", THOUSANDS_SEPARATOR) +
      "K"
    );
  }
  return num.toString();
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
  const [intPart, decPart] = amount.toFixed(2).split(".");
  const numeric = `${groupIntegerDigits(intPart)}.${decPart}`;
  return currency === "EUR" ? `${numeric} €` : `$${numeric}`;
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