import React, { useEffect, useMemo, useRef, useState } from "react";
import { MODE_FRAMES, ThinkingOrb, type ModeFrame } from "thinking-orbs";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollAreaWithIndicator } from "@/components/ui/scroll-area-with-indicator";
import { GAME_CONSTANTS } from "@/game/constants";
import { useInviteFriendsFloatingRendered } from "@/components/game/inviteFriendsFloatingUi";
import {
  isNewVillagerLogEntry,
  resolveLogPanelMessage,
} from "@/i18n/logDisplay";
import { isStartScreenNarrativeLogEntry } from "@/i18n/resolveGameText";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { setPerfUiCounter } from "@/lib/perfProbe";
import { cn } from "@/lib/utils";

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
/** Unread text pulses for this long, then stays still. The marker dot keeps going. */
const UNREAD_FLASH_MS = 15 * 60 * 1000;
const NEW_VILLAGER_ORB_COLOR = "rgb(255, 255, 255)";
// thinking-orbs only draws at 20, 32, or 64. Paint at 20 and show it smaller.
const UNREAD_ORB_DRAW = 20;
const UNREAD_ORB_PX = 12;
/**
 * Filter toggles: paint at ThinkingOrb's smallest native size (20), then
 * CSS-shrink to 18. Only 20 / 32 / 64 are valid size props.
 */
const LOG_FILTER_ORB_DRAW = 20 as const;
const LOG_FILTER_ORB_PX = 16;
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

function unreadLineIsFlashing(
  isUnread: boolean,
  isTailLine: boolean,
  timestamp: number,
  now: number,
): boolean {
  return (
    isUnread &&
    !isTailLine &&
    Number.isFinite(timestamp) &&
    now - timestamp < UNREAD_FLASH_MS
  );
}

/** Center fill when a filter toggle is on. */
const LOG_FILTER_ACTIVE_DOT_PX = 3;
/** Filter chrome unlocks once the log has this many non-start-screen lines. */
const LOG_FILTER_MIN_ENTRIES = 5;

function LogFilterOrbButton({
  active,
  color,
  label,
  testId,
  onToggle,
}: {
  active: boolean;
  color: string;
  label: string;
  testId: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center justify-center rounded-sm p-0.5 transition-opacity duration-150",
        active
          ? "opacity-60 group-hover/log-filter:opacity-100"
          : "opacity-25 group-hover/log-filter:opacity-55",
      )}
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: LOG_FILTER_ORB_PX, height: LOG_FILTER_ORB_PX }}
        aria-hidden={true}
      >
        <ThinkingOrb
          state="breathing"
          size={LOG_FILTER_ORB_DRAW}
          theme="dark"
          frame={unreadOrbFrame}
          color={color}
          className="absolute inset-0"
          style={{ width: LOG_FILTER_ORB_PX, height: LOG_FILTER_ORB_PX }}
          dotSize={2.5}
          dots={0.4}
          paused
        />
        {active ? (
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: LOG_FILTER_ACTIVE_DOT_PX,
              height: LOG_FILTER_ACTIVE_DOT_PX,
              backgroundColor: color,
            }}
          />
        ) : null}
      </span>
    </button>
  );
}

function LogTypeFilter({
  showNewVillagers,
  showOther,
  onToggleNewVillagers,
  onToggleOther,
  clearInvite,
  fadedIn,
}: {
  showNewVillagers: boolean;
  showOther: boolean;
  onToggleNewVillagers: () => void;
  onToggleOther: () => void;
  clearInvite: boolean;
  fadedIn: boolean;
}) {
  const { t } = useUiTranslation();
  const newVillagersLabel = t("logPanel.filterNewVillagers", {
    defaultValue: "New villagers",
  });
  const otherLabel = t("logPanel.filterOther", {
    defaultValue: "Other messages",
  });

  return (
    <div
      className={cn(
        // right-0: line up with footer Social (log column already has pr-2).
        "group/log-filter absolute right-1 z-10 flex flex-col items-center gap-1.5 border-0 bg-transparent py-2 pl-2 pr-0 shadow-none outline-none transition-[bottom,opacity] duration-1000 ease-out",
        // Web invite CTA sits over the log corner on desktop; lift while it is painted.
        clearInvite ? "bottom-1 md:bottom-14" : "bottom-1",
        fadedIn ? "opacity-100" : "opacity-0",
      )}
      data-testid="log-type-filter"
    >
      <LogFilterOrbButton
        active={showNewVillagers}
        color={NEW_VILLAGER_ORB_COLOR}
        label={newVillagersLabel}
        testId="log-filter-new-villagers"
        onToggle={onToggleNewVillagers}
      />
      <LogFilterOrbButton
        active={showOther}
        color={UNREAD_ORB_COLOR}
        label={otherLabel}
        testId="log-filter-other"
        onToggle={onToggleOther}
      />
    </div>
  );
}

function LogPanel() {
  const { i18n } = useUiTranslation();
  const log = useGameStore((s) => s.log);
  const readLogIds = useGameStore((s) => s.readLogIds);
  const markLogEntryRead = useGameStore((s) => s.markLogEntryRead);
  const showNewVillagers = useGameStore(
    (s) => s.logFilterShowNewVillagers !== false,
  );
  const showOther = useGameStore((s) => s.logFilterShowOther !== false);
  const setLogFilterShowNewVillagers = useGameStore(
    (s) => s.setLogFilterShowNewVillagers,
  );
  const setLogFilterShowOther = useGameStore((s) => s.setLogFilterShowOther);
  const inviteFloatingRendered = useInviteFriendsFloatingRendered();
  const readEntries = useMemo(() => new Set(readLogIds), [readLogIds]);
  const topRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(log.length);
  // Bumped when the next unread pulse expires, so a quiet log still stops flashing.
  const [flashNow, setFlashNow] = useState(() => Date.now());
  const [filterFadedIn, setFilterFadedIn] = useState(false);
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
    setPerfUiCounter("logReadEntries", readLogIds.length);
  }, [readLogIds]);

  const eligibleLogCount = useMemo(
    () =>
      log.filter((entry) => !isStartScreenNarrativeLogEntry(entry)).length,
    [log, i18n.language],
  );
  const filterUnlocked = eligibleLogCount >= LOG_FILTER_MIN_ENTRIES;

  useEffect(() => {
    if (!filterUnlocked) {
      setFilterFadedIn(false);
      return;
    }
    // Paint at opacity 0 first, then fade in on the next frames.
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setFilterFadedIn(true));
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [filterUnlocked]);

  // Get only the last entries and reverse them so latest is at top
  const recentEntries = useMemo(
    () =>
      log
        .filter((entry) => !isStartScreenNarrativeLogEntry(entry))
        .filter((entry) => {
          // Type filters only apply once the filter chrome has unlocked.
          if (!filterUnlocked) return true;
          if (isNewVillagerLogEntry(entry)) return showNewVillagers;
          return showOther;
        })
        .slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES)
        .reverse(),
    [log, i18n.language, showNewVillagers, showOther, filterUnlocked],
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

  useEffect(() => {
    const now = Date.now();
    let nextFlashEnd = Infinity;
    const flashingCount = Math.min(
      recentEntries.length,
      LOG_TAIL_FADE_START_INDEX,
    );
    for (let index = 0; index < flashingCount; index++) {
      const entry = recentEntries[index] as ExtendedLogEntry;
      if (readEntries.has(entry.id)) continue;
      const timestamp = entry.timestamp;
      if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) continue;
      const endsAt = timestamp + UNREAD_FLASH_MS;
      if (endsAt <= now) continue;
      if (endsAt < nextFlashEnd) nextFlashEnd = endsAt;
    }
    if (nextFlashEnd === Infinity) return;

    const timeout = setTimeout(() => {
      setFlashNow(Date.now());
    }, nextFlashEnd - now);
    return () => clearTimeout(timeout);
  }, [recentEntries, readEntries, flashNow]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <ScrollAreaWithIndicator
        className="h-full w-full"
        scrollAreaId="event-log"
      >
        <div className="pl-0 relative">
          <div ref={topRef} />
          <div className="space-y-[calc(0.25rem*0.5)] md:space-y-1 text-sm pb-10 pr-6">
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
              const blinkClass = unreadLineIsFlashing(
                isUnread,
                isTailLine,
                typedEntry.timestamp,
                flashNow,
              )
                ? "animate-pulse"
                : "";

              const markReadNow = () => {
                const existing = markReadTimeoutsRef.current.get(typedEntry.id);
                if (existing) {
                  clearTimeout(existing);
                  markReadTimeoutsRef.current.delete(typedEntry.id);
                }
                pendingTouchReadIdsRef.current.delete(typedEntry.id);
                markLogEntryRead(typedEntry.id);
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
                    // 1lh slot keeps the fixed-px orb centered on the first
                    // text line at every text size (mt-1 only fit Normal).
                    <span
                      className="inline-flex shrink-0 items-center justify-center self-start"
                      style={{ width: UNREAD_ORB_PX, height: "1lh" }}
                      aria-hidden={true}
                    >
                      <ThinkingOrb
                        state="breathing"
                        size={UNREAD_ORB_DRAW}
                        theme="dark"
                        frame={unreadOrbFrame}
                        color={
                          isNewVillager
                            ? NEW_VILLAGER_ORB_COLOR
                            : UNREAD_ORB_COLOR
                        }
                        className="shrink-0"
                        style={{
                          width: UNREAD_ORB_PX,
                          height: UNREAD_ORB_PX,
                        }}
                        dotSize={2.5}
                        dots={0.4}
                        speed={1.2}
                        aria-hidden={true}
                      />
                    </span>
                  ) : (
                    <span
                      className="shrink-0 self-start"
                      style={{ width: UNREAD_ORB_PX, height: "1lh" }}
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
      {filterUnlocked ? (
        <LogTypeFilter
          showNewVillagers={showNewVillagers}
          showOther={showOther}
          onToggleNewVillagers={() =>
            setLogFilterShowNewVillagers(!showNewVillagers)
          }
          onToggleOther={() => setLogFilterShowOther(!showOther)}
          clearInvite={inviteFloatingRendered}
          fadedIn={filterFadedIn}
        />
      ) : null}
    </div>
  );
}

export default React.memo(LogPanel);
