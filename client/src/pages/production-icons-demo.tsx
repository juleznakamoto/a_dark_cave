import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Redirect } from "wouter";
import { CircularProgress } from "@/components/ui/circular-progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";
import {
  GAME_PANEL_HEADER_INDICATOR_CLASS,
  GAME_PANEL_HEADER_INDICATOR_INNER_CLASS,
  GAME_PANEL_HEADER_INDICATOR_SIZE_PX,
} from "@/components/game/gameChrome";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import {
  DIALOG_INDICATOR_ICONS,
  HEADER_INDICATOR_ICONS,
  HEARTFIRE_INDICATOR_ICONS,
  OUTCOME_DIALOG_ICONS,
  getHeaderIndicatorIconsVersion,
  subscribeHeaderIndicatorIcons,
} from "@/game/headerIndicatorIcons";

function HeaderIndicator({
  ringClassName,
  glyphClassName,
  children,
}: {
  ringClassName: string;
  glyphClassName: string;
  children: ReactNode;
}) {
  return (
    <div className={GAME_PANEL_HEADER_INDICATOR_CLASS} data-prod-icon>
      <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
        <CircularProgress
          value={65}
          size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
          fill
          strokeWidth={2}
          className={ringClassName}
        />
        <span className={glyphClassName}>{children}</span>
      </div>
    </div>
  );
}

/** Hairline through the ring center. Drawn on the display box, not inside CSS scale. */
function CenterCross() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div
        className="absolute left-1/2 top-0 h-full -translate-x-1/2 bg-red-500/50"
        style={{ width: 0.5 }}
      />
      <div
        className="absolute left-0 top-1/2 w-full -translate-y-1/2 bg-red-500/50"
        style={{ height: 0.5 }}
      />
    </div>
  );
}

function DialogIconCell({
  id,
  label,
  iconRing,
  ringClassName,
  glyphClassName,
  symbol,
  uiIcon,
  uiIconSizeClassName,
  uiIconClassName,
}: {
  id: string;
  label: string;
  iconRing: string;
  ringClassName?: string;
  glyphClassName: string;
  symbol: string;
  uiIcon?: "reward" | "exclusiveReward";
  uiIconSizeClassName?: string;
  uiIconClassName?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-full border-2",
          iconRing,
          ringClassName,
        )}
        data-prod-dialog-icon={id}
      >
        {uiIcon ? (
          <GameUiIcon
            name={uiIcon}
            sizeClassName={uiIconSizeClassName}
            className={uiIconClassName}
          />
        ) : (
          <span
            className={cn(glyphClassName, uiIconSizeClassName)}
            aria-hidden
          >
            {symbol}
          </span>
        )}
        <CenterCross />
      </div>
      <div className="text-center text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function HeaderIconCell({
  label,
  ringClassName,
  glyphClassName,
  children,
  scale = 1,
}: {
  label: string;
  ringClassName: string;
  glyphClassName: string;
  children: ReactNode;
  scale?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex items-center justify-center leading-none"
        style={
          scale === 1
            ? { width: 18, height: 18 }
            : { width: 18 * scale, height: 18 * scale }
        }
      >
        <div
          className="flex leading-none"
          style={
            scale === 1
              ? undefined
              : { transform: `scale(${scale})`, transformOrigin: "center" }
          }
        >
          <HeaderIndicator
            ringClassName={ringClassName}
            glyphClassName={glyphClassName}
          >
            {children}
          </HeaderIndicator>
        </div>
        <CenterCross />
      </div>
      <div className="text-center text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function ProductionIconsDemo() {
  useSyncExternalStore(
    subscribeHeaderIndicatorIcons,
    getHeaderIndicatorIconsVersion,
    getHeaderIndicatorIconsVersion,
  );
  useEffect(() => {
    mountNotoSansSymbols2FontFace();
  }, []);

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  return (
    <ScrollArea className="h-[100dvh] w-full bg-black">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-8 text-foreground">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">Production effect icons</h1>
          <p className="text-sm text-muted-foreground">
            Dev-only. Header rings copy VillagePanel / EstatePanel markup
            (CircularProgress + GAME_PANEL_HEADER_*). Dialog rings copy
            OutcomeDialog + DIALOG_INDICATOR_ICONS /
            OUTCOME_DIALOG_ICONS. Red cross marks the
            geometric center of each ring.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">
            Header rings (18px, as in game)
          </h2>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-5">
            {HEADER_INDICATOR_ICONS.map((icon) => (
              <HeaderIconCell
                key={icon.id}
                label={icon.label}
                ringClassName={icon.ringClassName}
                glyphClassName={icon.glyphClassName}
              >
                {icon.symbol}
              </HeaderIconCell>
            ))}
            {HEARTFIRE_INDICATOR_ICONS.map((icon) => (
              <HeaderIconCell
                key={icon.id}
                label={icon.label}
                ringClassName={icon.ringClassName}
                glyphClassName={icon.glyphClassName}
              >
                {icon.symbol}
              </HeaderIconCell>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">
            Header rings zoomed 5x (same 18px widget)
          </h2>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-8">
            {HEADER_INDICATOR_ICONS.map((icon) => (
              <HeaderIconCell
                key={`z-${icon.id}`}
                label={icon.label}
                ringClassName={icon.ringClassName}
                glyphClassName={icon.glyphClassName}
                scale={5}
              >
                {icon.symbol}
              </HeaderIconCell>
            ))}
            {HEARTFIRE_INDICATOR_ICONS.map((icon) => (
              <HeaderIconCell
                key={`z-${icon.id}`}
                label={icon.label}
                ringClassName={icon.ringClassName}
                glyphClassName={icon.glyphClassName}
                scale={5}
              >
                {icon.symbol}
              </HeaderIconCell>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">
            Village-effect dialog rings (56px)
          </h2>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
            {DIALOG_INDICATOR_ICONS.map((icon) => (
              <DialogIconCell
                key={icon.id}
                id={icon.id}
                label={icon.label}
                iconRing={icon.iconRing}
                glyphClassName={icon.glyphClassName}
                symbol={icon.symbol}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">
            Reward and outcome dialog rings (56px)
          </h2>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
            {OUTCOME_DIALOG_ICONS.map((icon) => (
              <DialogIconCell
                key={icon.id}
                id={icon.id}
                label={icon.label}
                iconRing={icon.iconRing}
                ringClassName={icon.ringClassName}
                glyphClassName={icon.glyphClassName}
                symbol={icon.symbol}
                uiIcon={icon.uiIcon}
                uiIconSizeClassName={icon.uiIconSizeClassName}
                uiIconClassName={icon.uiIconClassName}
              />
            ))}
          </div>
        </section>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
