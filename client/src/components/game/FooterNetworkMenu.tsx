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
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  NETWORK_MENU_PLATFORM_ORDER,
} from "@/lib/gameFooterSocialLinks";
import { tWithFallback } from "@/i18n/resolveGameText";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/z-index";
import { GAME_CHROME_NO_BG_HOVER } from "./gameChrome";

type FooterNetworkMenuProps = {
  /** Trigger button classes (game footer chrome by default). */
  triggerClassName?: string;
  /** Show the "Social" label (hidden on mobile when using footer social label class). */
  labelClassName?: string;
  iconClassName?: string;
  iconSizeClassName?: string;
  /** Dropdown opens upward in the game footer. */
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  /** Open on mount (start-screen click-to-load). */
  defaultOpen?: boolean;
  /**
   * Native button with no shadcn size/padding. Start-screen placeholder and
   * loaded trigger must share the same box so hover-prefetch does not jump.
   */
  unstyledTrigger?: boolean;
};

export default function FooterNetworkMenu({
  triggerClassName,
  labelClassName = "hidden sm:inline text-neutral-300 opacity-80 transition-opacity group-hover:opacity-100 group-hover:!text-neutral-300",
  iconClassName = "text-neutral-300 opacity-80 transition-opacity group-hover:opacity-100 group-hover:!text-neutral-300",
  iconSizeClassName = "game-tab-icon",
  side = "top",
  align = "end",
  defaultOpen = false,
  unstyledTrigger = false,
}: FooterNetworkMenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const socialLabel = tWithFallback("ui", "footer.social", "Social");

  const triggerInner = (
    <>
      <GameUiIcon
        name="network"
        sizeClassName={iconSizeClassName}
        className={iconClassName}
      />
      <span className={labelClassName}>{socialLabel}</span>
    </>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        {unstyledTrigger ? (
          <button
            type="button"
            data-testid="button-footer-social"
            aria-label={socialLabel}
            className={triggerClassName}
          >
            {triggerInner}
          </button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            button_id="footer-social"
            data-testid="button-footer-social"
            aria-label={socialLabel}
            className={cn(
              `group shrink-0 px-1 py-1 text-xs text-neutral-300 hover:!text-neutral-300 flex items-center gap-1 ${GAME_CHROME_NO_BG_HOVER}`,
              triggerClassName,
            )}
          >
            {triggerInner}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={8}
        className="text-xs !max-h-none w-auto"
        style={{ zIndex: Z_INDEX.dropdown }}
      >
        {NETWORK_MENU_PLATFORM_ORDER.map((platform) => {
          const { href, title } = GAME_FOOTER_RIGHT_ICON_LINKS[platform];
          const label =
            platform === "contact"
              ? tWithFallback("ui", "footer.email", title)
              : title;
          const isExternal = href.startsWith("http");

          return (
            <DropdownMenuItem
              key={platform}
              onSelect={() => {
                setOpen(false);
                if (isExternal) {
                  window.open(href, "_blank", "noopener,noreferrer");
                } else {
                  window.location.href = href;
                }
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
