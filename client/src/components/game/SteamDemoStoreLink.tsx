import { Button } from "@/components/ui/button";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { LayoutAnimation } from "@/components/ui/motion-layout-animation";
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

const HEADER_STORE_LINK_CLASS = `group flex h-7 shrink-0 items-center gap-1 px-1 ${GAME_CHROME_NO_BG_HOVER}`;
const HEADER_STORE_LABEL_CLASS =
  "text-xs font-medium tracking-wide text-neutral-300 opacity-80 transition-opacity group-hover:opacity-100";

/** Small centered header link on demo editions (Steam overlay on desktop). */
export function SteamDemoHeaderStoreLink() {
  const demoEditionActive = useDemoEditionActive();
  const crazyGamesEditionActive = useCrazyGamesEditionActive();
  const { t } = useUiTranslation();

  if (!demoEditionActive || crazyGamesEditionActive) return null;

  const label = t("galaxy.storeHeaderLink", { defaultValue: "Add to wishlist" });

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      button_id="header-full-game-store"
      data-testid="header-full-game-store"
      onClick={() => {
        void openFullGameStore(STEAM_STORE_UTM_CONTENT.gameHeader);
      }}
      className={HEADER_STORE_LINK_CLASS}
    >
      <FooterSocialIcon
        platform="steam"
        className="h-3.5 w-3.5 text-[#66c0f4]"
      />
      <span className={HEADER_STORE_LABEL_CLASS}>{label}</span>
    </Button>
  );
}

/** Turns the what's-next teasers on and off. Sits to the right of the wishlist link. */
export function DemoEndHeaderLink() {
  const demoEnded = useDemoEnded();
  const hintsOn = useDemoEndCatalogActive();
  const setDemoNextHintsEnabled = useGameStore(
    (s) => s.setDemoNextHintsEnabled,
  );
  const { t } = useUiTranslation();

  if (!demoEnded) return null;

  const label = t("galaxy.seeWhatsNextButton", {
    defaultValue: "See what's coming",
  });

  return (
    <label className={`${HEADER_STORE_LINK_CLASS} whitespace-nowrap py-0`}>
      <GameUiIcon
        name="unlockedPadlock"
        sizeClassName="h-3.5 w-3.5"
        className="text-green-500 opacity-100"
      />
      <span className={HEADER_STORE_LABEL_CLASS}>{label}</span>
      <LayoutAnimation
        checked={hintsOn}
        onCheckedChange={setDemoNextHintsEnabled}
        aria-label={label}
        data-testid="header-see-whats-coming"
      />
    </label>
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
