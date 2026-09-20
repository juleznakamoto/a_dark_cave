import { useState, type CSSProperties } from "react";
import { useDocumentChromeVisualStage } from "@/game/chromeStageTransition";
import { gameActionOutlineButtonClassName } from "@/components/CooldownButton";
import { ConstructionQueueSlot } from "@/components/game/ConstructionQueueSlot";
import GameButton from "@/components/game/GameButton";
import { CLAIM_BUTTON_CLASS } from "@/achievements/achievementColors";
import {
  DESTROYED_CHROME_ENABLED,
  destroyedChromeMaskStyle,
  GAME_CHROME_RULE_BOTTOM,
  GAME_CHROME_RULE_LEFT,
  GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
  gameChromeDialogClassName,
  useDestroyedChrome,
} from "@/components/game/gameChrome";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { Button } from "@/components/ui/button";
import { ImproveButton } from "@/components/ui/improve-button";
import { cn } from "@/lib/utils";
import {
  ADC_CHROME_FROM_PROP,
  ADC_CHROME_SOLID_PROP,
  ADC_CHROME_STAGE_PREVIEW_CLASS,
  ADC_CHROME_TO_PROP,
  MADNESS_VISUAL_STAGE_LABELS,
  MADNESS_VISUAL_STAGE_MIN,
  MADNESS_VISUAL_STAGE_RANGES,
  parseChromeDistortionQuery,
  type MadnessVisualStage,
} from "@/game/madnessVisualStage";
import { DemoSection } from "@/pages/animations-demo/DemoSection";

const STAGES: MadnessVisualStage[] = [0, 1, 2, 3, 4];

function chromeStagePreviewStyle(stage: MadnessVisualStage): CSSProperties {
  const solid = stage === 0;
  return {
    [ADC_CHROME_FROM_PROP]: "0",
    [ADC_CHROME_TO_PROP]: solid ? "0" : "1",
    [ADC_CHROME_SOLID_PROP]: solid ? "1" : "0",
  } as CSSProperties;
}

function ChromeStageColumn({ stage }: { stage: MadnessVisualStage }) {
  const chromeOn = useDestroyedChrome();

  return (
    <div
      className={cn(
        ADC_CHROME_STAGE_PREVIEW_CLASS,
        "flex min-w-[24rem] flex-col gap-6 rounded-md border border-border/40 bg-neutral-950 p-6",
      )}
      data-adc-chrome-stage={stage}
      style={chromeStagePreviewStyle(stage)}
    >
      <p className="text-sm font-medium text-foreground">
        {MADNESS_VISUAL_STAGE_LABELS[stage]} · {MADNESS_VISUAL_STAGE_RANGES[stage]}
      </p>
      <div
        className={cn(
          "relative flex h-24 w-full items-center overflow-visible bg-background/80 px-4",
          GAME_CHROME_RULE_BOTTOM,
        )}
        aria-label="Horizontal chrome rule"
      >
        <span className="text-xs text-muted-foreground">H</span>
      </div>
      <div
        className={cn(
          "relative flex h-72 w-20 items-center justify-center overflow-visible bg-background/80",
          GAME_CHROME_RULE_LEFT,
        )}
        aria-label="Vertical chrome rule"
      >
        <span className="text-xs text-muted-foreground">V</span>
      </div>
      <div className="flex flex-col items-start gap-3">
        <GameButton
          variant="outline"
          size="lg"
          button_id="chrome-compare-gather"
        >
          Gather Wood
        </GameButton>
        <GameButton
          variant="outline"
          size="lg"
          button_id="chrome-compare-hut"
        >
          Wooden Hut
        </GameButton>
      </div>
      <ConstructionQueueSlot
        kind="free"
        testId="chrome-compare-slot"
        className="!h-10 !w-10"
      />
      <div
        className={cn(
          "relative min-h-[14rem] bg-background p-8 shadow-lg sm:rounded-lg",
          chromeOn ? gameChromeDialogClassName() : "border border-border",
        )}
        style={
          chromeOn ? destroyedChromeMaskStyle("chrome-compare-dialog") : undefined
        }
      >
        <p className="text-base font-semibold leading-none">A stranger arrives</p>
        <p className="mt-3 text-sm text-muted-foreground">
          The cave mouth is no longer empty.
        </p>
      </div>
    </div>
  );
}

export function ChromeStagesCompareSection() {
  return (
    <DemoSection
      id="chrome-stages"
      title="All madness stages"
      description="Same horizontal rule, vertical rule, two outline buttons, queue slot, and dialog frame at every madness band."
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[128rem] grid-cols-5 gap-6">
          {STAGES.map((stage) => (
            <ChromeStageColumn key={stage} stage={stage} />
          ))}
        </div>
      </div>
    </DemoSection>
  );
}

export function ChromeRulesSection() {
  const [stage, setStage] = useState<MadnessVisualStage>(
    () => parseChromeDistortionQuery(window.location.search) ?? 4,
  );
  useDocumentChromeVisualStage(stage);
  const chromeOn = useDestroyedChrome();

  const madness = MADNESS_VISUAL_STAGE_MIN[stage];
  const label = MADNESS_VISUAL_STAGE_LABELS[stage];
  const range = MADNESS_VISUAL_STAGE_RANGES[stage];

  return (
    <DemoSection
      id="chrome-rules"
      title="Destroyed chrome"
      description="Outline buttons, tooltips, dialog frames (including combat), and queue/preset slots. Distortion follows the side-panel madness bands. Stage 4 is the current worst look. Turn the whole treatment off with DESTROYED_CHROME_ENABLED."
    >
      <div className="space-y-4">
        <div className="space-y-2 rounded-md border border-border/40 bg-neutral-950 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-foreground">
              Madness {madness}
              {stage === 4 ? "+" : ""} · {label} ({range})
            </p>
            <p className="text-[11px] text-muted-foreground">
              {DESTROYED_CHROME_ENABLED
                ? "Destroyed chrome is on."
                : "Destroyed chrome is off. Slider still changes the stage attr."}
            </p>
          </div>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={stage}
            aria-label="Madness visual stage"
            className="w-full accent-red-700"
            onChange={(event) => {
              setStage(Number(event.target.value) as MadnessVisualStage);
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {STAGES.map((item) => (
              <button
                key={item}
                type="button"
                className={
                  item === stage
                    ? "text-foreground"
                    : "hover:text-foreground"
                }
                onClick={() => setStage(item)}
              >
                {MADNESS_VISUAL_STAGE_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Action buttons</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Outline actions use the same destroyed tiles as header and column
            seams. Hover Gather Wood for a tooltip.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <GameButton
              variant="outline"
              size="xs"
              button_id="chrome-demo-gather"
              tooltip="Gather wood from the cave. Costs nothing."
              tooltipId="chrome-demo-gather-tip"
            >
              Gather Wood
            </GameButton>
            <GameButton
              variant="outline"
              size="xs"
              button_id="chrome-demo-build"
              tooltip="Build a wooden hut. Costs 30 wood."
              tooltipId="chrome-demo-build-tip"
            >
              Wooden Hut
            </GameButton>
            <GameButton
              variant="outline"
              size="xs"
              disabled
              button_id="chrome-demo-disabled"
              tooltip="Need a hut before you can assign a hunter."
              tooltipId="chrome-demo-disabled-tip"
            >
              Hunter Hut
            </GameButton>
            <ImproveButton
              onClick={() => { }}
              disabled={false}
              button_id="chrome-demo-improve"
            />
            <Button
              variant="outline"
              size="xs"
              className={`h-5 px-2 ${CLAIM_BUTTON_CLASS.item}`}
              button_id="chrome-demo-claim"
            >
              Claim
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={
                chromeOn
                  ? "px-8 rounded-lg [--adc-chrome-rule-color:#374151] hover:bg-black/0 hover:text-gray-100 hover:[--adc-chrome-rule-color:#9ca3af]"
                  : "px-8 rounded-lg border-2 border-gray-700 hover:bg-black/0 hover:text-gray-100 hover:border-gray-400"
              }
              button_id="chrome-demo-cube-close"
            >
              Close
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Tooltip</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Same destroyed box as buttons, in the tooltip border color. This
            sample stays open.
          </p>
          <div className="relative min-h-[5.5rem] pt-2">
            <TooltipWrapper
              tooltip={
                <>
                  <p>Wood: 12 / 50</p>
                  <p className="text-muted-foreground">Gathered from the cave.</p>
                </>
              }
              tooltipId="chrome-demo-tooltip-sample"
              open
              side="bottom"
              tooltipTriggerAsChild
            >
              <span className="inline-block text-xs text-muted-foreground">
                Wood
              </span>
            </TooltipWrapper>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Dialog frame</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Same 1px box as buttons, in the dialog border color. Combat and
            other game dialogs use this DialogContent chrome.
          </p>
          <div
            className={cn(
              "relative w-full max-w-sm bg-background p-6 shadow-lg sm:rounded-lg",
              chromeOn
                ? gameChromeDialogClassName()
                : "border border-border",
            )}
            style={
              chromeOn
                ? destroyedChromeMaskStyle("chrome-demo-dialog")
                : undefined
            }
          >
            <p className="text-sm font-semibold leading-none">A stranger arrives</p>
            <p className="mt-2 text-xs text-muted-foreground">
              The cave mouth is no longer empty.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Job - / +</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Same cropped tiles and busy-stretch sampling as queue and preset
            marks, with a different phase per control.
          </p>
          <div
            data-testid="chrome-demo-job-buttons"
            className="grid w-fit grid-cols-[auto_3.5ch_auto] items-center gap-y-1.5 p-3"
          >
            {[
              ["gatherer", "8"],
              ["hunter", "2"],
              ["tanner", "2"],
            ].map(([jobId, count]) => (
              <div key={jobId} className="col-span-full grid grid-cols-subgrid items-center">
                <Button
                  size="xs"
                  variant="outline"
                  compactChrome
                  button_id={`chrome-demo-unassign-${jobId}`}
                  className={cn(
                    "villager-count-button min-h-0 shrink-0 p-0 inline-flex items-center justify-center leading-none font-normal",
                    gameActionOutlineButtonClassName(false),
                  )}
                >
                  <span className="leading-none tabular-nums">-</span>
                </Button>
                <span className="inline-flex w-full items-center justify-center text-sm tabular-nums">
                  {count}
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  compactChrome
                  button_id={`chrome-demo-assign-${jobId}`}
                  className={cn(
                    "villager-count-button min-h-0 shrink-0 p-0 inline-flex items-center justify-center leading-none font-normal",
                    gameActionOutlineButtonClassName(false),
                  )}
                >
                  <span className="leading-none tabular-nums">+</span>
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Queue and preset slots</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Same tiny-chrome rules as job −/+. Numbered presets keep the orange
            outline.
          </p>
          <div className="game-panel-header-slot-row flex flex-wrap items-center">
            <ConstructionQueueSlot kind="used" testId="chrome-demo-slot-used" />
            <ConstructionQueueSlot kind="free" testId="chrome-demo-slot-free" />
            <ConstructionQueueSlot kind="plus" testId="chrome-demo-slot-plus" />
            <ConstructionQueueSlot kind="locked" testId="chrome-demo-slot-locked" />
            <Button
              size="xs"
              variant="outline"
              compactChrome
              button_id="chrome-demo-preset-1"
              className={cn(
                GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
                "p-0 text-2xs tabular-nums",
                gameActionOutlineButtonClassName(false),
              )}
            >
              1
            </Button>
            <Button
              size="xs"
              variant="outline"
              compactChrome
              button_id="chrome-demo-preset-2"
              className={cn(
                GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
                "p-0 text-2xs tabular-nums",
                gameActionOutlineButtonClassName(false),
              )}
            >
              2
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="pt-1 text-[11px] leading-snug text-muted-foreground">
            Large inspect copy. Corners should meet, not cross, and the hairline
            should sit on the button edge.
          </p>
          <GameButton
            variant="outline"
            button_id="chrome-demo-large"
            className="h-40 w-full max-w-xl px-8 text-2xl"
            tooltip="Inspect corners and gap shards on a tall outline."
            tooltipId="chrome-demo-large-tip"
          >
            Gather Wood
          </GameButton>
        </div>
      </div>
    </DemoSection>
  );
}
