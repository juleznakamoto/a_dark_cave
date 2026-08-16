import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { GAME_CHROME_NO_BG_HOVER } from "@/components/game/gameChrome";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  NETWORK_MENU_PLATFORM_ORDER,
  type SteamStoreUtmContent,
  steamStoreUrl,
} from "@/lib/gameFooterSocialLinks";
import { tWithFallback } from "@/i18n/resolveGameText";
import { Z_INDEX } from "@/lib/z-index";

function openMenuHref(href: string): void {
  if (href.startsWith("http")) {
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }
  window.location.href = href;
}

/** Steam + community links for the CrazyGames header menu (not the footer). */
export function CrazyGamesMenuItems({
  steamUtmContent,
  onItemSelect,
}: {
  steamUtmContent: SteamStoreUtmContent;
  onItemSelect?: () => void;
}) {
  const steamHref = steamStoreUrl(steamUtmContent);
  const steamLabel = tWithFallback(
    "ui",
    "footer.wishlistOnSteam",
    "Wishlist on Steam",
  );

  return (
    <>
      <DropdownMenuItem
        onSelect={() => {
          onItemSelect?.();
          openMenuHref(steamHref);
        }}
      >
        <span className="flex items-center gap-1.5">
          <FooterSocialIcon
            platform="steam"
            className="w-4 h-4 shrink-0"
          />
          {steamLabel}
        </span>
      </DropdownMenuItem>
      {NETWORK_MENU_PLATFORM_ORDER.map((platform) => {
        const { href, title } = GAME_FOOTER_RIGHT_ICON_LINKS[platform];
        const label =
          platform === "contact"
            ? tWithFallback("ui", "footer.email", title)
            : title;
        return (
          <DropdownMenuItem
            key={platform}
            onSelect={() => {
              onItemSelect?.();
              openMenuHref(href);
            }}
          >
            <span className="flex items-center gap-1.5">
              <FooterSocialIcon
                platform={platform}
                className="w-4 h-4 shrink-0"
              />
              {label}
            </span>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}

const CORNER_MENU_BTN =
  `group shrink-0 p-0 w-7 h-7 flex items-center justify-center ${GAME_CHROME_NO_BG_HOVER}`;

/** Start-screen upper-right menu used only on CrazyGames. */
export default function CrazyGamesCornerMenu({
  steamUtmContent,
}: {
  steamUtmContent: SteamStoreUtmContent;
}) {
  const [open, setOpen] = useState(false);
  const menuLabel = tWithFallback("ui", "profile.title", "Menu");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={menuLabel}
          data-testid="button-crazygames-corner-menu"
          className={`${CORNER_MENU_BTN} group touch-manipulation`}
        >
          <GameUiIcon
            name="menu"
            sizeClassName="game-header-accent-icon"
            className="text-neutral-300 opacity-80 transition-opacity group-hover:opacity-100 group-hover:!text-neutral-300"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="text-xs !max-h-none w-auto"
        style={{ zIndex: Z_INDEX.dropdown }}
      >
        <CrazyGamesMenuItems
          steamUtmContent={steamUtmContent}
          onItemSelect={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
