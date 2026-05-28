import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
          <DialogDescription asChild>
            <div className="py-2 space-y-3 text-sm text-muted-foreground">
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
                      className="group flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-md px-2 py-1.5 text-foreground transition-colors hover:bg-muted/60"
                      aria-label={label}
                    >
                      <FooterSocialIcon
                        platform={platform}
                        className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground"
                      />
                      <span className="text-xs font-medium">{label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => useGameStore.setState({ feedbackDialogOpen: false })}
            className="w-full font-medium"
            button_id="feedback-dialog-continue"
          >
            {t("buttons.continue", { ns: "common" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
