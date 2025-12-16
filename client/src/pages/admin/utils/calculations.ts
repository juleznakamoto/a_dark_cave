
import { subDays, parseISO } from "date-fns";
import type { GameSaveData, ButtonClickData } from "../types/adminData";

export function getDailyActiveUsers(
  clickData: ButtonClickData[],
  gameSaves: GameSaveData[],
): number {
  const now = new Date();
  const cutoffDate = subDays(now, 1);
  const activeUserIds = new Set<string>();

  clickData.forEach((entry) => {
    const entryDate = parseISO(entry.timestamp);
    if (entryDate >= cutoffDate) {
      activeUserIds.add(entry.user_id);
    }
  });

  gameSaves.forEach((save) => {
    const saveDate = parseISO(save.updated_at);
    if (saveDate >= cutoffDate) {
      activeUserIds.add(save.user_id);
    }
  });

  return activeUserIds.size;
}

export function getWeeklyActiveUsers(
  clickData: ButtonClickData[],
  gameSaves: GameSaveData[],
): number {
  const now = new Date();
  const cutoffDate = subDays(now, 7);
  const activeUserIds = new Set<string>();

  clickData.forEach((entry) => {
    const entryDate = parseISO(entry.timestamp);
    if (entryDate >= cutoffDate) {
      activeUserIds.add(entry.user_id);
    }
  });

  gameSaves.forEach((save) => {
    const saveDate = parseISO(save.updated_at);
    if (saveDate >= cutoffDate) {
      activeUserIds.add(save.user_id);
    }
  });

  return activeUserIds.size;
}

export function getMonthlyActiveUsers(
  clickData: ButtonClickData[],
  gameSaves: GameSaveData[],
): number {
  const now = new Date();
  const cutoffDate = subDays(now, 30);
  const activeUserIds = new Set<string>();

  clickData.forEach((entry) => {
    const entryDate = parseISO(entry.timestamp);
    if (entryDate >= cutoffDate) {
      activeUserIds.add(entry.user_id);
    }
  });

  gameSaves.forEach((save) => {
    const saveDate = parseISO(save.updated_at);
    if (saveDate >= cutoffDate) {
      activeUserIds.add(save.user_id);
    }
  });

  return activeUserIds.size;
}

export function getAveragePlaytime(gameSaves: GameSaveData[]): number {
  const playtimes = gameSaves
    .map((save) => save.game_state?.playTime || 0)
    .filter((time) => time > 0);

  if (playtimes.length === 0) return 0;

  const avgMs = playtimes.reduce((sum, time) => sum + time, 0) / playtimes.length;
  return Math.round(avgMs / 1000 / 60);
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function cleanButtonName(buttonId: string): string {
  return buttonId
    .replace(/_\d{13,}_[\d.]+$/, "")
    .replace(/[-_]\d{13,}$/, "");
}
