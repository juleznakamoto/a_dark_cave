import { tWithFallback } from "@/i18n/resolveGameText";

const WATCHTOWER_KEYS = [
  "watchtower1",
  "watchtower2",
  "watchtower3",
  "watchtower4",
] as const;

const PALISADES_KEYS = [
  "palisades1",
  "palisades2",
  "palisades3",
  "palisades4",
] as const;

export function getWatchtowerTierLabel(level: number): string {
  const idx = level - 1;
  const key =
    idx >= 0 && idx < WATCHTOWER_KEYS.length
      ? WATCHTOWER_KEYS[idx]
      : "watchtowerFallback";
  const fallbacks: Record<string, string> = {
    watchtower1: "Watchtower",
    watchtower2: "Guard Tower",
    watchtower3: "Fortified Tower",
    watchtower4: "Cannon Tower",
    watchtowerFallback: "Watchtower",
  };
  return tWithFallback("ui", `fortifications.${key}`, fallbacks[key]);
}

export function getPalisadesTierLabel(level: number): string {
  const idx = level - 1;
  const key =
    idx >= 0 && idx < PALISADES_KEYS.length
      ? PALISADES_KEYS[idx]
      : "palisadesFallback";
  const fallbacks: Record<string, string> = {
    palisades1: "Wooden Palisades",
    palisades2: "Fortified Palisades",
    palisades3: "Stone Wall",
    palisades4: "Reinforced Wall",
    palisadesFallback: "Wooden Palisades",
  };
  return tWithFallback("ui", `fortifications.${key}`, fallbacks[key]);
}
