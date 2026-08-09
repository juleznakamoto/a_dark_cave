import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { AchievementChartConfig } from "@/achievements/achievementTypes";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GlowingShadow } from "@/components/ui/glowing-shadow";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { useGameStore } from "@/game/state";
import {
  copyInviteLinkToClipboard,
  isInviteNotSignedInError,
} from "@/game/copyInviteLink";
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
  isOverallAchievementCategoryEnabled,
  overallChartConfig,
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
const PREVIEW_MAX_WIDTH = 360;
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
const RING_LABEL_FONT_SIZE = 30;
const RING_LABEL_GAP = 10;
/** Matches `pt-1` on the 58px tab icon, scaled to the share ring size. */
const RING_SYMBOL_NUDGE_PX = 4 * (RING_CHART_SIZE / 58);

const CATEGORY_HEADER_KEYS: Record<
  AchievementChartConfig["idPrefix"],
  string
> = {
  basic: "achievements.categories.basic",
  building: "achievements.categories.building",
  item: "achievements.categories.item",
  action: "achievements.categories.action",
  overall: "achievements.categories.overall",
};

const CATEGORY_HEADER_DEFAULTS: Record<
  AchievementChartConfig["idPrefix"],
  string
> = {
  basic: "Basics",
  building: "Buildings",
  item: "Items",
  action: "Actions",
  overall: "Epic",
};

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
  ...(isOverallAchievementCategoryEnabled
    ? [
      {
        config: overallChartConfig,
        centerSymbolStyle: { paddingTop: RING_SYMBOL_NUDGE_PX * 0.5 },
      },
    ]
    : []),
];

/** Shared size for the "Resources" and "Achievements: X %" headings. */
const SECTION_HEADING_FONT_SIZE = 36;
const SECTION_HEADING_CLASS =
  "font-medium tracking-wide text-gray-300 leading-none";
const SECTION_PROGRESS_BAR_HEIGHT = 8;
/** Matches the 2×2 achievement ring grid so bar and content share edges. */
const SECTION_COLUMN_WIDTH = RING_CHART_SIZE * 2 + RING_GRID_GAP;
const SECTION_PROGRESS_GAP = 24;
const SECTION_BLOCK_MARGIN_BOTTOM = 24;
const CTA_FONT_SIZE = 42;

/** Vertical space for the resource list after header + section title (px). */
const RESOURCE_LIST_MAX_HEIGHT =
  SHARE_IMAGE_HEIGHT -
  64 * 2 - // p-16 top + bottom
  (80 + 48) - // title + mb-12
  (SECTION_HEADING_FONT_SIZE +
    SECTION_PROGRESS_GAP +
    SECTION_PROGRESS_BAR_HEIGHT +
    SECTION_BLOCK_MARGIN_BOTTOM);

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

/** Play time as e.g. 639h 15m (minute precision, same as leaderboard). */
function formatSharePlayTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function ShareProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-neutral-800"
      style={{ height: SECTION_PROGRESS_BAR_HEIGHT }}
    >
      <div
        className="h-full rounded-full bg-neutral-100"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function ShareSectionHeading({
  label,
  percent,
  align = "left",
}: {
  label: string;
  percent: number;
  align?: "left" | "right";
}) {
  return (
    <div
      className="flex w-full flex-col"
      style={{
        gap: SECTION_PROGRESS_GAP,
        marginBottom: SECTION_BLOCK_MARGIN_BOTTOM,
      }}
    >
      <div
        className={cn(
          SECTION_HEADING_CLASS,
          align === "right" && "text-right",
        )}
        style={{ fontSize: SECTION_HEADING_FONT_SIZE }}
      >
        {label}
      </div>
      <ShareProgressBar percent={percent} />
    </div>
  );
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
  resourcePercent,
  achievementPercent,
  resourcesLabel,
  achievementsLabel,
  ringLabels,
  cruelModeLabel,
  cruelModeValueLabel,
  playTimeLabel,
  playTimeMs,
}: {
  cardRef: React.RefObject<HTMLDivElement>;
  resources: Record<string, number>;
  seenResources: string[];
  resourcePercent: number;
  achievementPercent: number;
  resourcesLabel: string;
  achievementsLabel: string;
  ringLabels: Record<AchievementChartConfig["idPrefix"], string>;
  cruelModeLabel: string;
  cruelModeValueLabel: string;
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
      className="font-sans text-foreground overflow-hidden"
      style={{
        width: SHARE_IMAGE_WIDTH,
        height: SHARE_IMAGE_HEIGHT,
        backgroundColor: CARD_BG,
        borderRadius: 36,
      }}
    >
      <GlowingShadow
        variant="silver"
        size="frame"
        interactive
        contentClassName="relative flex flex-col"
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

          <div className="flex min-h-0 flex-1 justify-between gap-10">
            <div
              className="flex flex-col"
              style={{ width: SECTION_COLUMN_WIDTH }}
            >
              <ShareSectionHeading
                label={resourcesLabel}
                percent={resourcePercent}
              />
              <div
                className="flex w-full flex-col leading-none"
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
              className="flex shrink-0 flex-col"
              style={{ width: SECTION_COLUMN_WIDTH }}
            >
              <ShareSectionHeading
                label={achievementsLabel}
                percent={achievementPercent}
                align="right"
              />
              <div
                className="grid w-full grid-cols-2"
                style={{ gap: RING_GRID_GAP }}
              >
                {RING_ENTRIES.map(({ config, centerSymbolStyle }) => (
                  <div
                    key={config.idPrefix}
                    className="flex flex-col items-center"
                    style={{ gap: RING_LABEL_GAP }}
                  >
                    <div
                      className="font-medium leading-none tracking-wide text-gray-400"
                      style={{ fontSize: RING_LABEL_FONT_SIZE }}
                    >
                      {ringLabels[config.idPrefix]}
                    </div>
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
        </div>

        <div
          className="absolute bottom-16 left-16 flex flex-col font-medium text-neutral-100"
          style={{
            fontSize: CTA_FONT_SIZE,
            gap: 10,
            lineHeight: 1,
            width: "max-content",
            maxWidth: "calc(100% - 8rem)",
          }}
        >
          <div style={{ whiteSpace: "nowrap" }}>Play for free at</div>
          <div style={{ whiteSpace: "nowrap" }}>{SHARE_URL_IMAGE}</div>
        </div>
        <div
          className="absolute bottom-16 right-16 flex flex-col gap-3 text-right leading-none"
          style={{
            fontSize: 32,
            width: "max-content",
            maxWidth: "calc(100% - 8rem)",
          }}
        >
          <div style={{ whiteSpace: "nowrap" }}>
            <span className="text-gray-400">{cruelModeLabel}</span>{" "}
            <span className="text-gray-300">{cruelModeValueLabel}</span>
          </div>
          <div style={{ whiteSpace: "nowrap" }}>
            <span className="text-gray-400">{playTimeLabel}</span>{" "}
            <span className="text-gray-300">
              {formatSharePlayTime(playTimeMs)}
            </span>
          </div>
        </div>
      </GlowingShadow>
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
  const cruelMode = useGameStore((s) => s.cruelMode);
  const referralCount = useGameStore((s) => s.referralCount ?? 0);

  const cardRef = useRef<HTMLDivElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const cachedBlobRef = useRef<Blob | null>(null);
  const prefetchPromiseRef = useRef<Promise<Blob | null> | null>(null);
  const actionLockRef = useRef(false);
  const [previewScale, setPreviewScale] = useState(0.3);

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
    const update = () => {
      // Chrome-less dialog is w-max, so size from the viewport (card + button row).
      const maxW = Math.min(PREVIEW_MAX_WIDTH, window.innerWidth - 32);
      const maxH = window.innerHeight * 0.95 - 72;
      const scale = Math.min(
        maxW / SHARE_IMAGE_WIDTH,
        maxH / SHARE_IMAGE_HEIGHT,
      );
      setPreviewScale(scale > 0 ? scale : 0.3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  const renderShareBlob = async (): Promise<Blob | null> => {
    const node = cardRef.current;
    if (!node) return null;

    // Clone off-screen so preview keeps the glow while export omits border effects.
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText =
      "position:fixed;left:-10000px;top:0;pointer-events:none;opacity:0;";
    const clone = node.cloneNode(true) as HTMLElement;
    clone.querySelector(".adc-gs")?.classList.add("adc-gs--export");
    host.appendChild(clone);
    document.body.appendChild(host);

    try {
      // Ensure the real fonts are active in the live DOM, and inline them so the
      // off-screen SVG rasterization renders the resource icons in the correct font.
      const [fontEmbedCSS] = await Promise.all([
        getShareFontEmbedCss(),
        document.fonts?.ready?.catch(() => undefined),
      ]);
      const { toBlob } = await import("html-to-image");
      return await toBlob(clone, {
        width: SHARE_IMAGE_WIDTH,
        height: SHARE_IMAGE_HEIGHT,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: CARD_BG,
        fontEmbedCSS,
      });
    } finally {
      host.remove();
    }
  };

  /** Prefetched blob when ready; otherwise awaits in-flight prefetch / renders once. */
  const getShareBlob = async (): Promise<Blob | null> => {
    if (cachedBlobRef.current) return cachedBlobRef.current;
    if (prefetchPromiseRef.current) {
      const prefetched = await prefetchPromiseRef.current;
      if (prefetched) return prefetched;
    }
    const blob = await renderShareBlob();
    if (blob) cachedBlobRef.current = blob;
    return blob;
  };

  // Non-blocking: bake the PNG as soon as the dialog opens so actions are instant.
  useEffect(() => {
    if (!open) {
      cachedBlobRef.current = null;
      prefetchPromiseRef.current = null;
      return;
    }

    let cancelled = false;
    const startPrefetch = async () => {
      // Two frames: ensure ShareCard has committed and painted before capture.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      if (cancelled || !cardRef.current) return;

      const promise = renderShareBlob()
        .then((blob) => {
          if (!cancelled && blob) cachedBlobRef.current = blob;
          return blob;
        })
        .catch((error) => {
          logger.error("Failed to prefetch share image", error);
          return null;
        })
        .finally(() => {
          if (prefetchPromiseRef.current === promise) {
            prefetchPromiseRef.current = null;
          }
        });
      prefetchPromiseRef.current = promise;
    };

    void startPrefetch();
    return () => {
      cancelled = true;
    };
    // Snapshot at open only; do not rebuild on live resource ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only prefetch
  }, [open]);

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
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      const blob = await getShareBlob();
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
      actionLockRef.current = false;
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
      const notSignedIn = isInviteNotSignedInError(error);
      if (!notSignedIn) {
        logger.error("Failed to copy invite link:", error);
      }
      toast({
        title: notSignedIn
          ? t("invite.copyFailedNotSignedIn", {
            defaultValue: "Sign in to copy your invite link",
          })
          : t("invite.copyFailed"),
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      const blob = await getShareBlob();
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
      actionLockRef.current = false;
    }
  };

  const handleCopyImage = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      const blob = await getShareBlob();
      if (!blob) throw new Error("Failed to render share image");
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("Clipboard image copy not supported");
      }
      const type = blob.type || "image/png";
      await navigator.clipboard.write([
        new ClipboardItem({
          // Safari requires a Promise-valued ClipboardItem in some versions.
          [type]: Promise.resolve(blob),
        }),
      ]);
      toast({
        title: t("share.copiedTitle", {
          defaultValue: "Copied to clipboard",
        }),
      });
    } catch (error) {
      logger.error("Failed to copy progress image", error);
      toast({
        title: t("share.copyErrorTitle", {
          defaultValue: "Could not copy image",
        }),
        description: t("share.copyErrorDesc", {
          defaultValue: "Something went wrong while copying to the clipboard.",
        }),
        variant: "destructive",
      });
    } finally {
      actionLockRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
      <DialogContent
        skipViewportWidthClamp
        layerZIndex={70}
        className="flex w-max max-w-[min(95vw,28rem)] max-h-[95vh] flex-col items-center gap-4 overflow-visible border-0 bg-transparent p-0 shadow-none sm:rounded-none"
      >
        <DialogTitle className="sr-only">
          {t("share.title", { defaultValue: "Share your progress" })}
        </DialogTitle>

        <div
          ref={previewWrapRef}
          className="relative shrink-0 overflow-visible"
          style={{
            width: SHARE_IMAGE_WIDTH * previewScale,
            height: SHARE_IMAGE_HEIGHT * previewScale,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SHARE_IMAGE_WIDTH,
              height: SHARE_IMAGE_HEIGHT,
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
            }}
          >
            <ShareCard
              cardRef={cardRef}
              resources={resources}
              seenResources={seenResources}
              resourcePercent={resourcePercent}
              achievementPercent={percent}
              resourcesLabel={t("share.resources", {
                percent: resourcePercent,
                defaultValue: "Resources: {{percent}} %",
              })}
              achievementsLabel={t("share.achievements", {
                percent,
                defaultValue: "Achievements: {{percent}} %",
              })}
              ringLabels={{
                basic: t(CATEGORY_HEADER_KEYS.basic, {
                  defaultValue: CATEGORY_HEADER_DEFAULTS.basic,
                }),
                building: t(CATEGORY_HEADER_KEYS.building, {
                  defaultValue: CATEGORY_HEADER_DEFAULTS.building,
                }),
                item: t(CATEGORY_HEADER_KEYS.item, {
                  defaultValue: CATEGORY_HEADER_DEFAULTS.item,
                }),
                action: t(CATEGORY_HEADER_KEYS.action, {
                  defaultValue: CATEGORY_HEADER_DEFAULTS.action,
                }),
                overall: t(CATEGORY_HEADER_KEYS.overall, {
                  defaultValue: CATEGORY_HEADER_DEFAULTS.overall,
                }),
              }}
              cruelModeLabel={t("share.cruelMode", {
                defaultValue: "Cruel Mode",
              })}
              cruelModeValueLabel={
                cruelMode
                  ? t("share.on", { defaultValue: "On" })
                  : t("share.off", { defaultValue: "Off" })
              }
              playTimeLabel={t("share.playTime", {
                defaultValue: "Play time",
              })}
              playTimeMs={playTimeMs}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-center gap-2">
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
            <Button
              variant="outline"
              size="xs"
              className="shrink-0 font-medium px-3"
              onClick={() => {
                void handleCopyInviteLink();
              }}
            >
              {t("invite.copyInviteCode", {
                defaultValue: "Copy Invite Code",
              })}
            </Button>
          </TooltipWrapper>
          <Button
            variant="outline"
            size="xs"
            className="shrink-0 font-medium px-3"
            onClick={() => {
              void handleDownload();
            }}
          >
            {t("share.save", { defaultValue: "Save" })}
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="shrink-0 font-medium px-3"
            onClick={() => {
              void handleCopyImage();
            }}
          >
            {t("share.copy", { defaultValue: "Copy" })}
          </Button>
          <Button
            size="xs"
            className="shrink-0 font-medium px-3"
            onClick={() => {
              void handleShare();
            }}
          >
            {t("share.share", { defaultValue: "Share" })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
