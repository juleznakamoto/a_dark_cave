import React, { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MODE_FRAMES, ThinkingOrb, type ModeFrame } from "thinking-orbs";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollAreaWithIndicator } from "@/components/ui/scroll-area-with-indicator";
import { GAME_CONSTANTS } from "@/game/constants";
import {
  isNewVillagerLogEntry,
  resolveLogPanelMessage,
} from "@/i18n/logDisplay";
import { isStartScreenNarrativeLogEntry } from "@/i18n/resolveGameText";
import { setPerfUiCounter } from "@/lib/perfProbe";

// Extended log entry type to support "production" type if it exists in the data
type ExtendedLogEntry =
  | LogEntry
  | {
    message: string;
    type: "production";
    id: string;
    timestamp: number;
  };

const MARK_READ_HOVER_MS = 300;
const NEW_VILLAGER_ORB_COLOR = "rgb(255, 255, 255)";
// thinking-orbs only draws at 20, 32, or 64. Paint at 20 and show it smaller.
const UNREAD_ORB_DRAW = 20;
const UNREAD_ORB_PX = 12;
/** `hsl(0, 87.6%, 52.55%)`, the `--primary` token. ThinkingOrb only accepts rgb() or hex. */
const UNREAD_ORB_COLOR = "rgb(240, 28, 28)";

/**
 * Breathing ring at full ink. On a dark theme the library multiplies the tint
 * by each dot's shade, which turns this red into a darker maroon.
 */
const unreadOrbFrame: ModeFrame = (size, t, opts) => {
  const frame = MODE_FRAMES.ring(size, t, opts);
  return {
    dots: frame.dots.map((dot) => ({ ...dot, white: 0, a: 1 })),
    lines: frame.lines,
  };
};

/** 0-based index of 1-based line 36 in a full log. */
const LOG_TAIL_FADE_START_INDEX = GAME_CONSTANTS.LOG_MAX_ENTRIES - 5;

/** Lines 36–40. Unread drops 15 points per line from 100%. Read drops 7.5 from 50%. */
function logLineOpacity(isUnread: boolean, index: number): number {
  const basePercent = isUnread ? 100 : 50;
  const step = isUnread ? 15 : 7.5;
  const fadeSteps = index - LOG_TAIL_FADE_START_INDEX + 1;
  const fadePercent = fadeSteps > 0 ? fadeSteps * step : 0;
  return (basePercent - fadePercent) / 100;
}

function LogPanel() {
  const { i18n } = useTranslation("ui");
  const log = useGameStore((s) => s.log);
  const [readEntries, setReadEntries] = useState<Set<string>>(() => new Set());
  const topRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(log.length);
  const markReadTimeoutsRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  // Touch ids whose pointerdown has not been consumed by click or cancelled.
  // A short tap ends before the dwell timer; click still fires for a tap, not a scroll.
  const pendingTouchReadIdsRef = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      markReadTimeoutsRef.current.forEach(clearTimeout);
      markReadTimeoutsRef.current.clear();
      pendingTouchReadIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setPerfUiCounter("logReadEntries", readEntries.size);
  }, [readEntries]);

  // Get only the last entries and reverse them so latest is at top
  const recentEntries = useMemo(
    () =>
      log
        .filter((entry) => !isStartScreenNarrativeLogEntry(entry))
        .slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES)
        .reverse(),
    [log, i18n.language],
  );

  // Auto-scroll the log viewport to the newest entry (top). Do not use
  // scrollIntoView: in an iframe (CrazyGames) it also scrolls the host page.
  useEffect(() => {
    if (log.length > prevLogLengthRef.current && topRef.current) {
      const viewport = topRef.current.closest(
        "[data-radix-scroll-area-viewport]",
      );
      if (viewport instanceof HTMLElement) {
        viewport.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    prevLogLengthRef.current = log.length;
  }, [log.length]);

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <ScrollAreaWithIndicator
        className="h-full w-full"
        scrollAreaId="event-log"
      >
        <div className="pl-0 relative">
          <div ref={topRef} />
          <div className="space-y-[calc(0.25rem*0.5)] md:space-y-1 text-sm pb-1">
            {recentEntries.map((entry: any, index: number) => {
              const typedEntry = entry as ExtendedLogEntry;
              const isUnread = !readEntries.has(typedEntry.id);

              const lineOpacity = logLineOpacity(isUnread, index);
              const isTailLine = index >= LOG_TAIL_FADE_START_INDEX;
              const showNewIndicator = isUnread;
              const isNewVillager = isNewVillagerLogEntry(
                typedEntry as LogEntry,
              );
              // Pulse sets opacity itself, which would hide the tail fade.
              const blinkClass = isUnread && !isTailLine ? "animate-pulse" : "";

              const markReadNow = () => {
                const existing = markReadTimeoutsRef.current.get(typedEntry.id);
                if (existing) {
                  clearTimeout(existing);
                  markReadTimeoutsRef.current.delete(typedEntry.id);
                }
                pendingTouchReadIdsRef.current.delete(typedEntry.id);
                setReadEntries((prev) => {
                  if (prev.has(typedEntry.id)) return prev;
                  const next = new Set(prev);
                  next.add(typedEntry.id);
                  return next;
                });
              };

              const startMarkReadTimer = () => {
                if (!isUnread) return;

                const existing = markReadTimeoutsRef.current.get(typedEntry.id);
                if (existing) clearTimeout(existing);

                const timeout = setTimeout(() => {
                  markReadNow();
                }, MARK_READ_HOVER_MS);

                markReadTimeoutsRef.current.set(typedEntry.id, timeout);
              };

              const cancelMarkReadTimer = () => {
                const timeout = markReadTimeoutsRef.current.get(typedEntry.id);
                if (timeout) {
                  clearTimeout(timeout);
                  markReadTimeoutsRef.current.delete(typedEntry.id);
                }
              };

              const cancelTouchRead = () => {
                pendingTouchReadIdsRef.current.delete(typedEntry.id);
                cancelMarkReadTimer();
              };

              return (
                <div
                  key={typedEntry.id}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "touch") return;
                    startMarkReadTimer();
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "touch") return;
                    cancelMarkReadTimer();
                  }}
                  onPointerDown={(e) => {
                    if (e.pointerType !== "touch") return;
                    pendingTouchReadIdsRef.current.add(typedEntry.id);
                    startMarkReadTimer();
                  }}
                  onPointerUp={(e) => {
                    if (e.pointerType !== "touch") return;
                    // Release before the dwell timer. A tap still emits click.
                    cancelMarkReadTimer();
                  }}
                  onPointerCancel={cancelTouchRead}
                  onClick={() => {
                    if (!pendingTouchReadIdsRef.current.has(typedEntry.id)) return;
                    markReadNow();
                  }}
                  className="group flex items-start gap-2 text-foreground leading-relaxed py-[calc(0.125rem*0.5)] md:py-0.5"
                >
                  {showNewIndicator ? (
                    <ThinkingOrb
                      state="breathing"
                      size={UNREAD_ORB_DRAW}
                      theme="dark"
                      frame={unreadOrbFrame}
                      color={
                        isNewVillager ? NEW_VILLAGER_ORB_COLOR : UNREAD_ORB_COLOR
                      }
                      className="mt-1 shrink-0"
                      style={{ width: UNREAD_ORB_PX, height: UNREAD_ORB_PX }}
                      dotSize={2.5}
                      dots={0.4}
                      speed={1.2}
                      aria-hidden={true}
                    />
                  ) : (
                    <span
                      className="shrink-0"
                      style={{ width: UNREAD_ORB_PX }}
                      aria-hidden={true}
                    />
                  )}
                  <span
                    style={
                      { "--log-line-opacity": lineOpacity } as React.CSSProperties
                    }
                    className={`flex-1 min-w-0 opacity-[var(--log-line-opacity)] group-hover:opacity-100 group-hover:animate-none ${blinkClass}`}
                  >
                    {resolveLogPanelMessage(typedEntry as LogEntry)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollAreaWithIndicator>
    </div>
  );
}

export default React.memo(LogPanel);
