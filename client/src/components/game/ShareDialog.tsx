import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { AchievementChartConfig } from "@/achievements/achievementTypes";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { useGameStore } from "@/game/state";
import { copyInviteLinkToClipboard } from "@/game/copyInviteLink";
import {
  REFERRAL_REWARD_GOLD,
  SOCIAL_PROMPT_REFERRAL_CAP,
} from "@/game/socialPromptAuto";
import { ResourceCoinIcon } from "@/components/ui/resource-coin-icon";
import { ResourceInsightIcon } from "@/components/ui/resource-insight-icon";
import AchievementMiniRingChart from "@/achievements/AchievementMiniRingChart";
import {
  basicChartConfig,
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
} from "@/achievements";
import { getOverallAchievementPercent } from "@/achievements/achievementProgress";
import { COMBAT_ITEM_RESOURCES } from "@/game/resourceLimits";
import { getResourceName } from "@/i18n/resolveGameText";
import { capitalizeWords, cn, formatNumber } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getShareFontEmbedCss } from "@/lib/shareImageFonts";
import { useToast } from "@/hooks/use-toast";
import { gameStateSchema, type GameState } from "@shared/schema";

const SHARE_IMAGE_WIDTH = 1080;
const SHARE_IMAGE_HEIGHT = 1350;
const CARD_BG = "#0b0b0e";
const SHARE_URL = "https://a-dark-cave.com";
const SHARE_URL_IMAGE = "a-dark-cave.com";

const SHARE_FILE_NAME = "a-dark-cave.png";

const RESOURCE_ORDER = Object.keys(gameStateSchema.parse({}).resources);
const PRECIOUS_RESOURCE_ORDER = ["gold", "silver", "insight"] as const;
/** Share card: resource rows at or above this amount count toward the header %. */
const SHARE_RESOURCE_MILESTONE = 50_000;

const RING_CHART_SIZE = 208;
const RING_GRID_GAP = 40;
/** Nudge achievement rings right for clearer separation from the resource list. */
const ACHIEVEMENT_COLUMN_OFFSET = 32;
/** Matches `pt-1` on the 58px tab icon, scaled to the share ring size. */
const RING_SYMBOL_NUDGE_PX = 4 * (RING_CHART_SIZE / 58);

type ShareRingEntry = {
  config: AchievementChartConfig;
  centerSymbolStyle?: CSSProperties;
};

const RING_ENTRIES: ShareRingEntry[] = [
  { config: basicChartConfig },
  {
    config: buildingChartConfig,
    centerSymbolStyle: { paddingTop: RING_SYMBOL_NUDGE_PX },
  },
  {
    config: itemChartConfig,
    centerSymbolStyle: { paddingTop: RING_SYMBOL_NUDGE_PX },
  },
  {
    config: actionChartConfig,
    centerSymbolStyle: { paddingTop: RING_SYMBOL_NUDGE_PX },
  },
];

/** Shared size for the "Resources" and "Achievements: X %" headings. */
const SECTION_HEADING_FONT_SIZE = 36;
const SECTION_HEADING_CLASS =
  "mb-6 font-medium tracking-wide text-gray-300 leading-none";

/** Vertical space for the resource list after header + section title (px). */
const RESOURCE_LIST_MAX_HEIGHT =
  SHARE_IMAGE_HEIGHT -
  64 * 2 - // p-16 top + bottom
  (80 + 48) - // title + mb-12
  (SECTION_HEADING_FONT_SIZE + 24); // section heading + mb-6

function getResourceListMetrics(
  rowCount: number,
  hasPreciousSpacer: boolean,
): { fontSize: number; rowGap: number } {
  if (rowCount <= 0) return { fontSize: 30, rowGap: 6 };
  const spacer = hasPreciousSpacer ? 12 : 0;
  const targetRowHeight = (RESOURCE_LIST_MAX_HEIGHT - spacer) / rowCount;
  const rowGap = Math.max(2, Math.min(6, Math.round(targetRowHeight * 0.1)));
  const fontSize = Math.max(
    16,
    Math.min(32, Math.floor(targetRowHeight - rowGap)),
  );
  return { fontSize, rowGap };
}

/** HH:MM play time — same rounding as the leaderboard. */
function formatSharePlayTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function getVisibleResourceKeys(
  resources: Record<string, number>,
  seenResources: string[],
): { precious: string[]; others: string[] } {
  const seen = new Set(seenResources);
  for (const [key, amount] of Object.entries(resources)) {
    if (amount > 0) seen.add(key);
  }
  const seenKeys = RESOURCE_ORDER.filter((key) => seen.has(key));
  const precious = PRECIOUS_RESOURCE_ORDER.filter((key) =>
    seenKeys.includes(key),
  );
  const others = seenKeys.filter(
    (key) =>
      !PRECIOUS_RESOURCE_ORDER.includes(
        key as (typeof PRECIOUS_RESOURCE_ORDER)[number],
      ) && !COMBAT_ITEM_RESOURCES.includes(key as never),
  );
  return { precious, others };
}

function getVisibleResourceKeyList(
  resources: Record<string, number>,
  seenResources: string[],
): string[] {
  const { precious, others } = getVisibleResourceKeys(resources, seenResources);
  return [...precious, ...others];
}

/** % of visible resources with amount >= SHARE_RESOURCE_MILESTONE. */
function getResourceMilestonePercent(
  resources: Record<string, number>,
  seenResources: string[],
): number {
  const keys = getVisibleResourceKeyList(resources, seenResources);
  if (keys.length === 0) return 0;
  const met = keys.filter(
    (key) => (resources[key] ?? 0) >= SHARE_RESOURCE_MILESTONE,
  ).length;
  return Math.round((met / keys.length) * 100);
}

function ShareResourceRow({
  resourceKey,
  value,
}: {
  resourceKey: string;
  value: number;
}) {
  const meetsMilestone = value >= SHARE_RESOURCE_MILESTONE;
  const icon =
    resourceKey === "insight" ? (
      <ResourceInsightIcon className="shrink-0 text-blue-600" />
    ) : resourceKey === "gold" || resourceKey === "silver" ? (
      <ResourceCoinIcon
        resource={resourceKey}
        className={cn(
          "shrink-0",
          resourceKey === "gold" ? "text-yellow-600" : "text-gray-400",
        )}
      />
    ) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-10 leading-none">
      <span className="inline-flex items-center gap-2 text-gray-400">
        {icon}
        <span>
          {getResourceName(resourceKey, capitalizeWords(resourceKey))}
        </span>
      </span>
      <div className="grid grid-cols-[auto_1.25em] items-baseline gap-x-2">
        <span className="text-right font-mono tabular-nums text-gray-300">
          {formatNumber(value)}
        </span>
        <span className="text-right text-green-500 leading-none" aria-hidden>
          {meetsMilestone ? "✓" : null}
        </span>
      </div>
    </div>
  );
}

/**
 * The off-DOM 1080×1350 share card. Rendered at full size and visually scaled
 * down in the preview; `cardRef` is captured at native resolution.
 */
function ShareCard({
  cardRef,
  resources,
  seenResources,
  percent,
  resourcesLabel,
  achievementsLabel,
  playTimeLabel,
  playTimeMs,
}: {
  cardRef: React.RefObject<HTMLDivElement>;
  resources: Record<string, number>;
  seenResources: string[];
  percent: number;
  resourcesLabel: string;
  achievementsLabel: string;
  playTimeLabel: string;
  playTimeMs: number;
}) {
  const { precious, others } = getVisibleResourceKeys(resources, seenResources);
  const hasPreciousSpacer = precious.length > 0 && others.length > 0;
  const resourceRowCount = precious.length + others.length;
  const { fontSize: resourceFontSize, rowGap: resourceRowGap } =
    getResourceListMetrics(resourceRowCount, hasPreciousSpacer);

  return (
    <div
      ref={cardRef}
      className="relative flex flex-col font-sans text-foreground"
      style={{
        width: SHARE_IMAGE_WIDTH,
        height: SHARE_IMAGE_HEIGHT,
        backgroundColor: CARD_BG,
      }}
    >
      <div className="flex h-full flex-col p-16">
        <div className="mb-12">
          <div
            className="font-bold leading-none tracking-tight text-neutral-100"
            style={{ fontSize: 80 }}
          >
            A Dark Cave
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-10">
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              className={SECTION_HEADING_CLASS}
              style={{ fontSize: SECTION_HEADING_FONT_SIZE }}
            >
              {resourcesLabel}
            </div>
            <div
              className="flex flex-col leading-none"
              style={{ fontSize: resourceFontSize, rowGap: resourceRowGap }}
            >
              {precious.map((key) => (
                <ShareResourceRow
                  key={key}
                  resourceKey={key}
                  value={resources[key] ?? 0}
                />
              ))}
              {hasPreciousSpacer && <div style={{ height: 12 }} />}
              {others.map((key) => (
                <ShareResourceRow
                  key={key}
                  resourceKey={key}
                  value={resources[key] ?? 0}
                />
              ))}
            </div>
          </div>

          <div
            className="flex shrink-0 flex-col items-start"
            style={{ marginLeft: ACHIEVEMENT_COLUMN_OFFSET }}
          >
            <div
              className={SECTION_HEADING_CLASS}
              style={{ fontSize: SECTION_HEADING_FONT_SIZE }}
            >
              {achievementsLabel}
            </div>
            <div className="grid grid-cols-2" style={{ gap: RING_GRID_GAP }}>
              {RING_ENTRIES.map(({ config, centerSymbolStyle }) => (
                <div
                  key={config.idPrefix}
                  className="flex items-center justify-center"
                >
                  <AchievementMiniRingChart
                    config={config}
                    isActive
                    size={RING_CHART_SIZE}
                    centerSymbolStyle={centerSymbolStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-16 left-16 font-medium leading-none text-gray-400"
          style={{ fontSize: 32 }}
        >
          Play for free at {SHARE_URL_IMAGE}
        </div>
        <div
          className="absolute bottom-16 right-16 text-right leading-none"
          style={{ fontSize: 28 }}
        >
          <span className="text-gray-400">{playTimeLabel}</span>{" "}
          <span className="font-mono tabular-nums text-gray-300">
            {formatSharePlayTime(playTimeMs)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ShareDialog() {
  const { t } = useTranslation("ui");
  const { toast } = useToast();
  const open = useGameStore((s) => s.shareDialogOpen);
  const setOpen = useGameStore((s) => s.setShareDialogOpen);
  const resources = useGameStore((s) => s.resources) as Record<string, number>;
  const seenResources = useGameStore((s) => s.seenResources);
  const playTimeMs = useGameStore((s) => s.playTime);
  const referralCount = useGameStore((s) => s.referralCount ?? 0);

  const cardRef = useRef<HTMLDivElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.3);
  const [busy, setBusy] = useState(false);

  const percent = open
    ? getOverallAchievementPercent(
        useGameStore.getState() as unknown as GameState,
      )
    : 0;
  const resourcePercent = open
    ? getResourceMilestonePercent(resources, seenResources)
    : 0;

  useLayoutEffect(() => {
    if (!open) return;
    const el = previewWrapRef.current;
    if (!el) return;
    const update = () =>
      setPreviewScale(el.clientWidth / SHARE_IMAGE_WIDTH || 0.3);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const generateBlob = async (): Promise<Blob | null> => {
    const node = cardRef.current;
    if (!node) return null;
    // Ensure the real fonts are active in the live DOM, and inline them so the
    // off-screen SVG rasterization renders the resource icons in the correct font.
    const [fontEmbedCSS] = await Promise.all([
      getShareFontEmbedCss(),
      document.fonts?.ready?.catch(() => undefined),
    ]);
    const { toBlob } = await import("html-to-image");
    return toBlob(node, {
      width: SHARE_IMAGE_WIDTH,
      height: SHARE_IMAGE_HEIGHT,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: CARD_BG,
      fontEmbedCSS,
    });
  };

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = SHARE_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await generateBlob();
      if (!blob) throw new Error("Failed to render share image");
      const file = new File([blob], SHARE_FILE_NAME, { type: "image/png" });
      const shareData: ShareData = {
        files: [file],
        title: "A Dark Cave",
        text: t("share.shareText", {
          percent,
          defaultValue: `I'm ${percent}% through A Dark Cave. Play for free at ${SHARE_URL}`,
        }),
      };
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData);
      } else {
        downloadBlob(blob);
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      logger.error("Failed to share progress image", error);
      toast({
        title: t("share.errorTitle", {
          defaultValue: "Could not create image",
        }),
        description: t("share.errorDesc", {
          defaultValue: "Something went wrong while generating the image.",
        }),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await copyInviteLinkToClipboard();
      toast({
        title: t("invite.linkCopied"),
        description: t("invite.linkCopiedDesc", {
          amount: REFERRAL_REWARD_GOLD,
        }),
      });
    } catch (error) {
      logger.error("Failed to copy invite link:", error);
      toast({
        title: t("invite.copyFailed"),
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await generateBlob();
      if (!blob) throw new Error("Failed to render share image");
      downloadBlob(blob);
    } catch (error) {
      logger.error("Failed to download progress image", error);
      toast({
        title: t("share.errorTitle", {
          defaultValue: "Could not create image",
        }),
        description: t("share.errorDesc", {
          defaultValue: "Something went wrong while generating the image.",
        }),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
      <DialogContent
        className="[--adc-dialog-max-w:30rem] max-h-[90vh] flex flex-col overflow-hidden"
        layerZIndex={70}
      >
        <DialogHeader>
          <DialogTitle>
            {t("share.title", { defaultValue: "Share your progress" })}
          </DialogTitle>
          <DialogDescription>
            {t("share.description", {
              defaultValue: "Save or share an image of your game progress.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 justify-center overflow-auto py-2">
          {/* Outer width drives the preview scale; height reserves the scaled card. */}
          <div
            ref={previewWrapRef}
            className="w-full max-w-[360px] overflow-hidden rounded-md border border-border"
            style={{ height: SHARE_IMAGE_HEIGHT * previewScale }}
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
                width: SHARE_IMAGE_WIDTH,
                height: SHARE_IMAGE_HEIGHT,
              }}
            >
              <ShareCard
                cardRef={cardRef}
                resources={resources}
                seenResources={seenResources}
                percent={percent}
                resourcesLabel={t("share.resources", {
                  percent: resourcePercent,
                  defaultValue: "Resources: {{percent}} %",
                })}
                achievementsLabel={t("share.achievements", {
                  percent,
                  defaultValue: "Achievements: {{percent}} %",
                })}
                playTimeLabel={t("share.playTime", {
                  defaultValue: "Play time",
                })}
                playTimeMs={playTimeMs}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2">
          <TooltipWrapper
            tooltip={
              <p className="text-xs">
                {t("invite.tooltip", {
                  amount: REFERRAL_REWARD_GOLD,
                  cap: SOCIAL_PROMPT_REFERRAL_CAP,
                  count: referralCount,
                })}
              </p>
            }
            tooltipId="share-dialog-invite"
            tooltipContentClassName="max-w-xs"
            onClick={() => {
              void handleCopyInviteLink();
            }}
          >
            <Button variant="outline" size="sm" disabled={busy}>
              {t("invite.button")}
            </Button>
          </TooltipWrapper>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={busy}
          >
            {t("share.download", { defaultValue: "Download" })}
          </Button>
          <Button size="sm" onClick={handleShare} disabled={busy}>
            {busy
              ? t("share.generating", { defaultValue: "Generating…" })
              : t("share.share", { defaultValue: "Share" })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
