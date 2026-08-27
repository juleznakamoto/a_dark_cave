import { Button } from "@/components/ui/button";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  useCrazyGamesEditionActive,
  useDemoEditionActive,
} from "@/hooks/useSteamEditionActive";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { STEAM_STORE_UTM_CONTENT } from "@/lib/gameFooterSocialLinks";
import { openFullGameStore } from "@/lib/openFullGameStore";
import { GAME_CHROME_NO_BG_HOVER } from "./gameChrome";

/** Small centered header link on demo editions (Steam overlay on desktop). */
export function SteamDemoHeaderStoreLink() {
  const demoEditionActive = useDemoEditionActive();
  const crazyGamesEditionActive = useCrazyGamesEditionActive();
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
        className={`group flex h-7 shrink-0 items-center gap-1 px-1 ${GAME_CHROME_NO_BG_HOVER}`}
        aria-label={tooltip}
      >
        <FooterSocialIcon
          platform="steam"
          className="h-3.5 w-3.5 text-[#66c0f4]"
        />
        <span className="text-xs font-medium tracking-wide text-neutral-300 opacity-80 transition-opacity group-hover:opacity-100">
          {label}
        </span>
      </Button>
    </TooltipWrapper>
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
      size="lg"
      button_id="demo-end-wishlist"
      data-testid="button-demo-end-wishlist"
      onClick={() => {
        void openFullGameStore(STEAM_STORE_UTM_CONTENT.demoTimeUp);
      }}
      className="h-12 w-full text-sm"
    >
      <FooterSocialIcon platform="steam" className="h-5 w-5 shrink-0" />
      {buttonLabel}
    </Button>
  );
}
