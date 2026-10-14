import { Button } from "@/components/ui/button";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  useCrazyGamesEditionActive,
  useDemoEditionActive,
  useDemoEndCatalogActive,
  useDemoEnded,
} from "@/hooks/useSteamEditionActive";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { useGameStore } from "@/game/state";
import { STEAM_STORE_UTM_CONTENT } from "@/lib/gameFooterSocialLinks";
import { openFullGameStore } from "@/lib/openFullGameStore";
import { GAME_CHROME_NO_BG_HOVER } from "./gameChrome";

/** Small centered header link on demo editions (Steam overlay on desktop). */
export function SteamDemoHeaderStoreLink() {
  const demoEditionActive = useDemoEditionActive();
  const crazyGamesEditionActive = useCrazyGamesEditionActive();
  const demoEndCatalogActive = useDemoEndCatalogActive();
  const { t } = useUiTranslation();

  if (!demoEditionActive || crazyGamesEditionActive) return null;

  const label = t("galaxy.storeHeaderLink", { defaultValue: "Add to wishlist" });
  const tooltip = t("galaxy.storeHeaderTooltip", {
    defaultValue: "Add the full game to your Steam wishlist",
  });

  return (
    <TooltipWrapper
      tooltip={tooltip}
      tooltipId="header-full-game-store"
      className="inline-flex"
      tooltipTriggerClassName="inline-flex"
    >
      <Button
        type="button"
        variant="ghost"
        size="xs"
        button_id="header-full-game-store"
        data-testid="header-full-game-store"
        onClick={() => {
          void openFullGameStore(STEAM_STORE_UTM_CONTENT.gameHeader);
        }}
        className={`group flex h-7 shrink-0 items-center gap-1 ${demoEndCatalogActive
            ? `rounded-full border border-white px-2 text-white ${GAME_CHROME_NO_BG_HOVER}`
            : `px-1 ${GAME_CHROME_NO_BG_HOVER}`
          }`}
        aria-label={tooltip}
      >
        <FooterSocialIcon
          platform="steam"
          className="h-3.5 w-3.5 text-[#66c0f4]"
        />
        <span
          className={
            demoEndCatalogActive
              ? "text-xs font-medium tracking-wide text-white"
              : "text-xs font-medium tracking-wide text-neutral-300 opacity-80 transition-opacity group-hover:opacity-100"
          }
        >
          {label}
        </span>
      </Button>
    </TooltipWrapper>
  );
}

/** Reopens the demo-end screen after the hut cap. Sits to the right of the wishlist link. */
export function DemoEndHeaderLink() {
  const demoEnded = useDemoEnded();
  const setGalaxyTimeUpDialogOpen = useGameStore(
    (s) => s.setGalaxyTimeUpDialogOpen,
  );
  const { t } = useUiTranslation();

  if (!demoEnded) return null;

  const label = t("galaxy.seeWhatsNextButton", {
    defaultValue: "See what's coming",
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      button_id="header-see-whats-coming"
      data-testid="header-see-whats-coming"
      onClick={() => setGalaxyTimeUpDialogOpen(true)}
      className={`flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white px-2 text-xs font-medium tracking-wide text-white ${GAME_CHROME_NO_BG_HOVER}`}
    >
      <GameUiIcon
        name="unlockedPadlock"
        sizeClassName="h-3.5 w-3.5"
        className="opacity-100"
      />
      {label}
    </Button>
  );
}

/** Demo time-up wishlist button (Steam overlay on desktop). */
export function SteamDemoEndStoreCta() {
  const { t } = useUiTranslation();
  const buttonLabel = t("galaxy.wishlistButton", {
    defaultValue: "Add to wishlist",
  });

  return (
    <Button
      type="button"
      button_id="demo-end-wishlist"
      data-testid="button-demo-end-wishlist"
      onClick={() => {
        void openFullGameStore(STEAM_STORE_UTM_CONTENT.demoTimeUp);
      }}
      className="inline-flex items-center gap-1.5"
    >
      <FooterSocialIcon platform="steam" className="h-4 w-4 shrink-0" />
      {buttonLabel}
    </Button>
  );
}
