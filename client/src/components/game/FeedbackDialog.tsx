import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { SocialPlatformGlyph } from "@/components/game/SocialPlatformGlyph";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  OFFICIAL_INSTAGRAM_URL,
  OFFICIAL_REDDIT_URL,
} from "@/lib/gameFooterSocialLinks";
import { openGameFeedbackFormFromDialog } from "@/lib/gameFeedbackForm";
import { useTranslation } from "react-i18next";

type FeedbackContactId = "reddit" | "instagram" | "contact";

const FEEDBACK_CONTACTS: readonly {
  id: FeedbackContactId;
  href: string;
}[] = [
    { id: "reddit", href: OFFICIAL_REDDIT_URL },
    { id: "instagram", href: OFFICIAL_INSTAGRAM_URL },
    { id: "contact", href: GAME_FOOTER_RIGHT_ICON_LINKS.contact.href },
  ];

export default function FeedbackDialog() {
  const { t } = useTranslation("ui");
  const open = useGameStore((s) => s.feedbackDialogOpen);

  const contactLabel = (id: FeedbackContactId) => {
    if (id === "reddit") return t("feedback.reddit");
    if (id === "instagram") return t("feedback.instagram");
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
      <DialogContent className="[--adc-dialog-max-w:28rem] z-[70] !pb-4">
        <DialogHeader>
          <DialogTitle className="leading-6">{t("feedback.title")}</DialogTitle>
          <DialogDescription asChild className="!text-white">
            <div className="space-y-3 pt-2 pb-0 text-sm">
              <p>{t("feedback.message")}</p>
              <div className="flex justify-center pt-1 pb-2">
                <Button
                  type="button"
                  onClick={() => openGameFeedbackFormFromDialog()}
                  data-testid="button-feedback-open-form"
                  className="inline-flex items-center gap-1.5"
                >
                  <GameUiIcon
                    name="feedback"
                    sizeClassName="w-4 h-4"
                    className="opacity-100"
                  />
                  {t("feedback.openForm")}
                </Button>
              </div>
              <p>{t("feedback.contactVia")}</p>
              <div className="flex flex-wrap justify-center gap-4">
                {FEEDBACK_CONTACTS.map(({ id, href }) => {
                  const label = contactLabel(id);
                  return (
                    <a
                      key={id}
                      href={href}
                      {...(href.startsWith("http")
                        ? {
                          target: "_blank",
                          rel: "noopener noreferrer me",
                        }
                        : {})}
                      className="flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-md px-2 py-1.5 text-white opacity-80 transition-opacity hover:opacity-100"
                      aria-label={label}
                    >
                      {id === "instagram" ? (
                        <SocialPlatformGlyph
                          platformId="instagram"
                          sizeClassName="h-6 w-6 text-[#E4405F]"
                        />
                      ) : (
                        <FooterSocialIcon
                          platform={id}
                          variant="brand"
                          className="h-6 w-6"
                        />
                      )}
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
