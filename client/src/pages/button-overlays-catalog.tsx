import { useEffect, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
  INSIGHT_BADGE_LG_SIZE_CLASS,
  INSIGHT_BADGE_SIDE_PANEL_SIZE_CLASS,
} from "@/components/game/BuildingActionBadge";
import { PRIOR_BADGE_SIZE_PX } from "@/components/game/ButtonPriorBadge";
import { CONSTRUCTION_BOOST_GLYPH } from "@/components/game/ConstructionBoostBadge";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";
import {
  GAME_CHROME_NO_BG_HOVER,
  GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
  YELLOW_CORNER_DISC_CLASS,
} from "@/components/game/gameChrome";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import {
  getPriorDiscFillMetrics,
  getPriorDiscInnerFillStyle,
  getPriorDiscSurfaceColors,
  PRIOR_DISC_OUTER_TRANSITION,
} from "@/lib/priorDiscStyles";
import { cn } from "@/lib/utils";

export type ButtonOverlayCatalogEntry = {
  id: string;
  label: string;
  size: string;
  position: string;
  where: string;
};

/** SSOT of badges / mini-buttons placed on (or in the corner of) other buttons. */
export const BUTTON_OVERLAY_CATALOG: ButtonOverlayCatalogEntry[] = [
  {
    id: "level",
    label: "Level badge",
    size: "18×18",
    position: "top-right (-9px)",
    where: "Craft / gather action buttons. .button-level-badge",
  },
  {
    id: "level-max",
    label: "Level badge (max)",
    size: "18×18",
    position: "top-right (-9px)",
    where: "Same chip, star when maxed. .button-level-badge",
  },
  {
    id: "focus",
    label: "Focus points",
    size: "20×20",
    position: "top-right (-10px)",
    where: "Estate Focus button count chip. .button-focus-badge",
  },
  {
    id: "boost",
    label: "Construction / craft boost",
    size: "24×24 host",
    position: "top-right (-12px)",
    where: "Build / craft while executing. .action-button-corner-badge--boost",
  },
  {
    id: "prior",
    label: "Prior assign",
    size: "14×14",
    position: "bottom-right (-7px)",
    where: "Eligible action buttons. .button-prior-badge",
  },
  {
    id: "prior-on",
    label: "Prior assigned",
    size: "14×14",
    position: "bottom-right (-7px)",
    where: "Same disc, filled / assigned state",
  },
  {
    id: "abort",
    label: "Abort (X)",
    size: "16×16 host, 16×16 disc",
    position: "bottom-right (-8px)",
    where: "CooldownButton craft / build / Call Merchant. .button-corner-badge-16",
  },
  {
    id: "gold",
    label: "Buy Gold (+)",
    size: "18×18 host, 18×18 disc",
    position: "bottom-right (-9px)",
    where: "Forest gold sinks + timed-event buys. GoldShopBadge",
  },
  {
    id: "playlight-dot",
    label: "Playlight notification",
    size: "8×8 (h-2 w-2)",
    position: "top-right of icon (-4px)",
    where: "More Games footer button",
  },
  {
    id: "hotkey-dismiss",
    label: "Hotkey tutorial dismiss",
    size: "20×20",
    position: "top-right (-10px)",
    where: "Village hotkey tutorial box. .button-hotkey-dismiss",
  },
  {
    id: "compass-2x",
    label: "Compass 2x chip",
    size: "18×18",
    position: "centered on button",
    where: "CooldownButton compass glow (temporary)",
  },
];

export const BUTTON_OVERLAY_INSIGHT_SIZES: ButtonOverlayCatalogEntry[] = [
  {
    id: "insight-lg",
    label: "Insight badge (lg)",
    size: "22×22 trigger",
    position: "beside control",
    where: "Villager cap, achievements, timed-tab prolong, header overlay host",
  },
  {
    id: "insight-sm",
    label: "Insight badge (sm)",
    size: "16×16 trigger",
    position: "beside row",
    where: "Side-panel enchant + absolve",
  },
  {
    id: "insight-header",
    label: "Insight header slot",
    size: "18×18",
    position: "panel header",
    where: "Queue-slot / preset unlock next to header slot buttons",
  },
];

function DemoPriorBadge({ initialAssigned }: { initialAssigned: boolean }) {
  const [assigned, setAssigned] = useState(initialAssigned);
  const [hovered, setHovered] = useState(false);
  const fill = getPriorDiscFillMetrics(PRIOR_BADGE_SIZE_PX);
  const { background, boxShadow } = getPriorDiscSurfaceColors({
    active: assigned,
    surfaceLocked: false,
    hovered,
  });

  return (
    <button
      type="button"
      aria-pressed={assigned}
      aria-label={assigned ? "Prior assigned" : "Prior assign"}
      onClick={(e) => {
        e.stopPropagation();
        setAssigned((value) => !value);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "button-prior-badge border-0 p-0 appearance-none [-webkit-appearance:none]",
        assigned && "button-prior-badge--assigned",
      )}
      style={{
        borderRadius: "50%",
        background,
        boxShadow,
        zIndex: 20,
        cursor: "pointer",
        transition: PRIOR_DISC_OUTER_TRANSITION,
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        <div
          style={getPriorDiscInnerFillStyle({
            active: assigned,
            fillSize: fill.fillSize,
            fillOffsetInPx: fill.fillOffsetInPx,
            fillOffsetOutPx: fill.fillOffsetOutPx,
          })}
        />
      </div>
    </button>
  );
}

function SampleActionButton({
  label = "Action",
  children,
}: {
  label?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative inline-flex">
      <Button size="xs" variant="outline" type="button">
        {label}
      </Button>
      {children}
    </div>
  );
}

function OverlayCell({
  entry,
  children,
}: {
  entry: ButtonOverlayCatalogEntry;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2" data-button-overlay={entry.id}>
      <div className="flex min-h-[44px] items-end">{children}</div>
      <div className="max-w-[11rem] text-xs text-muted-foreground">
        <div className="font-medium text-foreground/80">{entry.label}</div>
        <div>{entry.size}</div>
        <div className="text-[10px] leading-snug">{entry.position}</div>
      </div>
    </div>
  );
}

function overlayById(id: string): ButtonOverlayCatalogEntry {
  const entry = BUTTON_OVERLAY_CATALOG.find((item) => item.id === id);
  if (!entry) {
    throw new Error(`Unknown button overlay catalog id: ${id}`);
  }
  return entry;
}

export function ButtonOverlaysCatalog() {
  useEffect(() => {
    mountNotoSansSymbols2FontFace();
  }, []);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium">
          Corner badges on action buttons (1:1)
        </h2>
        <p className="text-xs text-muted-foreground">
          Same CSS hosts and discs as Cave / Village / Forest / Estate. Sizes
          are Normal text (`--adc-control-scale: 1`).
        </p>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-8">
          <OverlayCell entry={overlayById("level")}>
            <SampleActionButton>
              <div className="button-level-badge game-corner-badge-digit flex items-center justify-center bg-red-950 rounded-full z-[20]">
                3
              </div>
            </SampleActionButton>
          </OverlayCell>

          <OverlayCell entry={overlayById("level-max")}>
            <SampleActionButton>
              <div className="button-level-badge game-corner-badge-digit flex items-center justify-center bg-red-950 rounded-full z-[20]">
                ★
              </div>
            </SampleActionButton>
          </OverlayCell>

          <OverlayCell entry={overlayById("focus")}>
            <SampleActionButton label="Focus">
              <div className="button-focus-badge game-corner-badge-digit flex items-center justify-center bg-teal-950 rounded-full z-[20] pointer-events-none">
                25
              </div>
            </SampleActionButton>
          </OverlayCell>

          <OverlayCell entry={overlayById("boost")}>
            <SampleActionButton label="Build Hut">
              <div className="action-button-corner-badge action-button-corner-badge--boost">
                <button
                  type="button"
                  className={getInsightBadgeTriggerClassName({
                    canAfford: true,
                    playing: false,
                    className: "flex h-full w-full",
                  })}
                >
                  <BuildingActionBadge
                    glyph={CONSTRUCTION_BOOST_GLYPH}
                    embedded
                    size="lg"
                  />
                </button>
              </div>
            </SampleActionButton>
          </OverlayCell>

          <OverlayCell entry={overlayById("prior")}>
            <SampleActionButton>
              <DemoPriorBadge initialAssigned={false} />
            </SampleActionButton>
          </OverlayCell>

          <OverlayCell entry={overlayById("prior-on")}>
            <SampleActionButton>
              <DemoPriorBadge initialAssigned />
            </SampleActionButton>
          </OverlayCell>

          <OverlayCell entry={overlayById("abort")}>
            <SampleActionButton label="Craft Torch">
              <div className="button-corner-badge-16">
                <button
                  type="button"
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-red-950 text-white shadow-sm border border-red-800/50"
                  aria-label="Abort"
                >
                  <X className="h-3 w-3 stroke-[3]" />
                </button>
              </div>
            </SampleActionButton>
          </OverlayCell>

          <OverlayCell entry={overlayById("gold")}>
            <SampleActionButton label="Buy Ember Bomb">
              <div className="button-corner-badge-18">
                <button
                  type="button"
                  className={cn(YELLOW_CORNER_DISC_CLASS, "h-full w-full")}
                  aria-label="Buy Gold"
                >
                  <Plus className="h-3 w-3 stroke-[3]" />
                </button>
              </div>
            </SampleActionButton>
          </OverlayCell>

          <OverlayCell entry={overlayById("playlight-dot")}>
            <Button
              variant="ghost"
              size="xs"
              type="button"
              className={cn(
                "relative shrink-0 overflow-visible px-1 py-1 text-xs text-neutral-300 flex items-center gap-1",
                GAME_CHROME_NO_BG_HOVER,
              )}
            >
              <span
                className="relative flex h-[calc(1.125rem*0.9)] w-[calc(1.125rem*0.9)] shrink-0 items-center justify-center"
                aria-hidden
              >
                <GameUiIcon
                  name="discover"
                  sizeClassName="h-full w-full"
                  className="text-blue-400 opacity-80"
                />
                <span className="notification-pulse absolute -right-[4px] -top-[4px] z-[2] h-2 w-2 rounded-full bg-red-600" />
              </span>
              More Games
            </Button>
          </OverlayCell>

          <OverlayCell entry={overlayById("hotkey-dismiss")}>
            <div className="relative h-10 w-28 rounded border border-red-500 bg-neutral-950">
              <button
                type="button"
                className="button-hotkey-dismiss flex items-center justify-center rounded-full bg-red-950 text-white shadow-sm border border-red-800/50"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 stroke-[3]" />
              </button>
            </div>
          </OverlayCell>

          <OverlayCell entry={overlayById("compass-2x")}>
            <div className="relative inline-flex">
              <Button size="xs" variant="outline" type="button" className="relative">
                Explore
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div
                    className={cn(
                      "button-compass-2x game-corner-badge-digit",
                      YELLOW_CORNER_DISC_CLASS,
                    )}
                  >
                    2x
                  </div>
                </div>
              </Button>
            </div>
          </OverlayCell>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">
          All corners on one action button
        </h2>
        <div className="relative inline-flex">
          <Button size="xs" variant="outline" type="button">
            Craft Torch
          </Button>
          <div className="action-button-corner-badge action-button-corner-badge--boost">
            <button
              type="button"
              className={getInsightBadgeTriggerClassName({
                canAfford: true,
                playing: false,
                className: "flex h-full w-full",
              })}
            >
              <BuildingActionBadge
                glyph={CONSTRUCTION_BOOST_GLYPH}
                embedded
                size="lg"
              />
            </button>
          </div>
          <div className="button-level-badge game-corner-badge-digit flex items-center justify-center bg-red-950 rounded-full z-[20]">
            2
          </div>
          <DemoPriorBadge initialAssigned />
          <div className="button-corner-badge-16">
            <button
              type="button"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-red-950 text-white shadow-sm border border-red-800/50"
              aria-label="Abort"
            >
              <X className="h-3 w-3 stroke-[3]" />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">
          Insight badge buttons (sit on / beside other controls)
        </h2>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-8">
          {BUTTON_OVERLAY_INSIGHT_SIZES.map((entry) => (
            <OverlayCell key={entry.id} entry={entry}>
              <button
                type="button"
                className={getInsightBadgeTriggerClassName({
                  canAfford: true,
                  playing: false,
                  className:
                    entry.id === "insight-sm"
                      ? INSIGHT_BADGE_SIDE_PANEL_SIZE_CLASS
                      : entry.id === "insight-header"
                        ? GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS
                        : INSIGHT_BADGE_LG_SIZE_CLASS,
                })}
              >
                <BuildingActionBadge
                  embedded
                  size={entry.id === "insight-sm" ? "sm" : "lg"}
                />
              </button>
            </OverlayCell>
          ))}
        </div>
      </section>
    </div>
  );
}
