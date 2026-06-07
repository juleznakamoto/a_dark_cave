import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGameStore } from "@/game/state";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  GAME_FOOTER_RIGHT_ICON_ORDER,
  type FooterSocialPlatformId,
} from "@/lib/gameFooterSocialLinks";
import { useTranslation } from "react-i18next";

const FEEDBACK_CONTACT_ORDER: readonly FooterSocialPlatformId[] =
  GAME_FOOTER_RIGHT_ICON_ORDER;

export default function FeedbackDialog() {
  const { t } = useTranslation("ui");
  const open = useGameStore((s) => s.feedbackDialogOpen);

  const contactLabel = (platform: FooterSocialPlatformId) => {
    if (platform === "reddit") return t("feedback.reddit");
    if (platform === "instagram") return t("feedback.instagram");
    return t("feedback.email");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          useGameStore.setState({ feedbackDialogOpen: false });
        }
      }}
    >
      <DialogContent className="[--adc-dialog-max-w:28rem] z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">{t("feedback.title")}</DialogTitle>
          <DialogDescription asChild className="!text-white">
            <div className="space-y-3 py-2 text-sm">
              <p>{t("feedback.message")}</p>
              <p>{t("feedback.contactVia")}</p>
              <div className="flex flex-wrap justify-center gap-4 pt-1">
                {FEEDBACK_CONTACT_ORDER.map((platform) => {
                  const { href } = GAME_FOOTER_RIGHT_ICON_LINKS[platform];
                  const label = contactLabel(platform);
                  return (
                    <a
                      key={platform}
                      href={href}
                      {...(href.startsWith("http")
                        ? {
                          target: "_blank",
                          rel: "noopener noreferrer me",
                        }
                        : {})}
                      className="group flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-md px-2 py-1.5 text-white transition-colors hover:bg-muted/60"
                      aria-label={label}
                    >
                      <FooterSocialIcon
                        platform={platform}
                        variant="brand"
                        className="h-6 w-6 transition-opacity md:opacity-90 md:group-hover:opacity-100"
                      />
                      <span className="text-xs font-medium">{label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
