import { useEffect, useRef } from "react";
import type { LogEntry } from "@/game/rules/eventTypes";
import {
  getMadnessVisualStage,
  type MadnessVisualStage,
} from "@/game/madnessVisualStage";

export const MADNESS_LEVEL_INCREASED_LOG_KEY = "madnessLevel.increased";
export const MADNESS_LEVEL_DECREASED_LOG_KEY = "madnessLevel.decreased";
export const MADNESS_LEVEL_INCREASED_LOG_EN =
  "You sink deeper into madness.";
export const MADNESS_LEVEL_DECREASED_LOG_EN =
  "Your madness eases.";

let madnessLevelLogEpoch = 0;

/** Call before load/restart/dev-save replace so a full state swap is not a level change. */
export function resetMadnessLevelLogBaseline(): void {
  madnessLevelLogEpoch += 1;
}

export function getMadnessLevelLogEpoch(): number {
  return madnessLevelLogEpoch;
}

export function madnessLevelLogDirection(
  fromStage: MadnessVisualStage | null,
  toStage: MadnessVisualStage,
  fromEpoch: number,
  toEpoch: number,
): "increased" | "decreased" | null {
  if (fromStage == null || fromEpoch !== toEpoch) return null;
  if (fromStage === toStage) return null;
  return toStage > fromStage ? "increased" : "decreased";
}

export function buildMadnessLevelLogEntry(
  direction: "increased" | "decreased",
  now = Date.now(),
): LogEntry {
  const increased = direction === "increased";
  return {
    id: `madness-level-${direction}-${now}`,
    message: increased
      ? MADNESS_LEVEL_INCREASED_LOG_EN
      : MADNESS_LEVEL_DECREASED_LOG_EN,
    logKey: increased
      ? MADNESS_LEVEL_INCREASED_LOG_KEY
      : MADNESS_LEVEL_DECREASED_LOG_KEY,
    timestamp: now,
    type: "system",
  };
}

/** Log when the madness visual band changes during play. */
export function useMadnessLevelChangeLog(
  madness: number,
  addLogEntry: (entry: LogEntry) => void,
): void {
  const baselineRef = useRef<{
    epoch: number;
    stage: MadnessVisualStage;
  } | null>(null);

  useEffect(() => {
    const stage = getMadnessVisualStage(madness);
    const epoch = getMadnessLevelLogEpoch();
    const direction = madnessLevelLogDirection(
      baselineRef.current?.stage ?? null,
      stage,
      baselineRef.current?.epoch ?? -1,
      epoch,
    );
    baselineRef.current = { epoch, stage };
    if (direction) {
      addLogEntry(buildMadnessLevelLogEntry(direction));
    }
  }, [madness, addLogEntry]);
}
