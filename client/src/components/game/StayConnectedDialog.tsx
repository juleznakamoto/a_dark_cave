import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { useGameStore } from "@/game/state";
import { useHideSteamStoreLink } from "@/hooks/useSteamEditionActive";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  NETWORK_MENU_PLATFORM_ORDER,
  STEAM_STORE_UTM_CONTENT,
  steamStoreUrl,
  type FooterSocialPlatformId,
} from "@/lib/gameFooterSocialLinks";

/**
 * Phone and iOS replacement for the footer social row.
 * Blocking: the world stays paused while the links are open.
 */
export default function StayConnectedDialog() {
  const { t } = useUiTranslation();
  const open = useGameStore((s) => s.stayConnectedDialogOpen);
  const setOpen = useGameStore((s) => s.setStayConnectedDialogOpen);
  const hideSteamStoreLink = useHideSteamStoreLink();

  const links: { id: FooterSocialPlatformId; href: string; label: string }[] =
    [];
  if (!hideSteamStoreLink) {
    links.push({
      id: "steam",
      href: steamStoreUrl(STEAM_STORE_UTM_CONTENT.profileMenu),
      label: "Steam",
    });
  }
  for (const platform of NETWORK_MENU_PLATFORM_ORDER) {
    const { href, title } = GAME_FOOTER_RIGHT_ICON_LINKS[platform];
    links.push({
      id: platform,
      href,
      label:
        platform === "contact"
          ? t("footer.email", { defaultValue: title })
          : title,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
      <DialogContent
        className="[--adc-dialog-max-w:20rem] gap-3"
        layerZIndex={70}
        backdrop="black"
      >
        <DialogHeader className="pb-0">
          <DialogTitle>
            {t("profile.stayConnected", { defaultValue: "Stay Connected" })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col">
          {links.map(({ id, href, label }) => (
            <a
              key={id}
              href={href}
              {...(href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted/40"
            >
              <FooterSocialIcon
                platform={id}
                variant="brand"
                className="h-4 w-4 shrink-0"
              />
              {label}
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
