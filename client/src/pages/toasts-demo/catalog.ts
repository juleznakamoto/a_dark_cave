import { FIRST_PURCHASE_INSIGHT_BONUS } from "@shared/firstPurchaseInsightBonus";
import { REFERRAL_REWARD_GOLD } from "@shared/schema";
import { SHOP_ITEMS } from "@shared/shopItems";
import { resolveShopItemName } from "@/i18n/shopLabels";
import { INSIGHT_GLYPH } from "@/game/villagerCapUpgrades";
import { formatCompactDuration, formatNumber } from "@/lib/utils";

/** Same grace window as the in-game version toast. */
const VERSION_REFRESH_SECONDS = 5 * 60;

export type ToastVariant = "default" | "destructive";

export type ToastSpecimen = {
  id: string;
  /** Short dev label. The card itself is the player-facing copy. */
  label: string;
  variant: ToastVariant;
  /** Sticky toasts stay up and hide the close button. */
  dismissible: boolean;
  /** Green check before the title. */
  success?: boolean;
  title: string;
  description?: string;
  actionLabel?: string;
};

export type ToastGroup = {
  title: string;
  specimens: ToastSpecimen[];
};

type Translate = (
  key: string,
  options?: Record<string, string | number>,
) => string;

function specimen(
  id: string,
  label: string,
  title: string,
  options?: {
    description?: string;
    variant?: ToastVariant;
    dismissible?: boolean;
    actionLabel?: string;
    success?: boolean;
  },
): ToastSpecimen {
  return {
    id,
    label,
    title,
    description: options?.description,
    variant: options?.variant ?? "default",
    dismissible: options?.dismissible ?? true,
    actionLabel: options?.actionLabel,
    success: options?.success,
  };
}

/**
 * Every distinct toast the game can show. Shared call sites (invite copy from
 * the menu, the share dialog, and the floating button) appear once.
 */
export function buildToastCatalog(t: Translate): ToastGroup[] {
  const goldGift = SHOP_ITEMS.gold_100_free;
  const singleItem = SHOP_ITEMS.gold_1000;
  const bundle = SHOP_ITEMS.basic_survival_bundle;
  const singleName = resolveShopItemName(singleItem);
  const bundleName = resolveShopItemName(bundle);
  const insightLine = t("shop.firstPurchaseInsightGranted", {
    amount: formatNumber(FIRST_PURCHASE_INSIGHT_BONUS),
    glyph: INSIGHT_GLYPH,
  });
  const singleAdded = t("shop.purchaseAddedSingle", { name: singleName });
  const bundleAdded = t("shop.purchaseAddedBundle", { name: bundleName });
  const stripeItemLine = `${singleItem.name} is now available.`;
  const refreshLabel = t("versionUpdate.refresh");

  return [
    {
      title: "Version",
      specimens: [
        specimen(
          "version-countdown",
          "New version, refresh countdown",
          t("versionUpdate.title"),
          {
            description: t("versionUpdate.description", {
              time: formatCompactDuration(VERSION_REFRESH_SECONDS),
            }),
            dismissible: false,
            actionLabel: refreshLabel,
          },
        ),
        specimen(
          "version-manual",
          "New version, refresh yourself",
          t("versionUpdate.title"),
          {
            description: t("versionUpdate.descriptionManual"),
            dismissible: false,
            actionLabel: refreshLabel,
          },
        ),
      ],
    },
    {
      title: "Shop",
      specimens: [
        specimen(
          "shop-free-gold",
          "Daily free gold",
          t("common:status.success"),
          {
            description: t("shop.freeGoldAdded", {
              amount: goldGift.rewards.resources?.gold ?? 0,
            }),
            success: true,
          },
        ),
        specimen(
          "shop-payment-failed",
          "Payment could not start",
          t("shop.paymentFailed"),
          {
            description: t("shop.unexpectedError"),
            variant: "destructive",
          },
        ),
        specimen(
          "shop-payment-rate-limit",
          "Too many payment requests",
          t("shop.paymentFailed"),
          {
            description: t("shop.tooManyPaymentRequests"),
            variant: "destructive",
          },
        ),
        specimen(
          "shop-purchase-single",
          "Purchase added",
          t("shop.purchaseSuccessful"),
          { description: singleAdded, success: true },
        ),
        specimen(
          "shop-purchase-bundle",
          "Bundle purchase added",
          t("shop.purchaseSuccessful"),
          { description: bundleAdded, success: true },
        ),
        specimen(
          "shop-purchase-insight",
          "Purchase added, first Insight gift",
          t("shop.purchaseSuccessful"),
          { description: `${singleAdded} ${insightLine}`, success: true },
        ),
        specimen(
          "shop-purchase-bundle-insight",
          "Bundle purchase added, first Insight gift",
          t("shop.purchaseSuccessful"),
          { description: `${bundleAdded} ${insightLine}`, success: true },
        ),
      ],
    },
    {
      title: "Payment return",
      specimens: [
        specimen("stripe-failed", "Payment failed", "Payment failed", {
          description:
            "The payment was not completed. You can try again from the shop.",
          variant: "destructive",
        }),
        specimen(
          "stripe-processing",
          "Payment still processing",
          "Payment processing",
          {
            description:
              "Your payment is still being processed. Purchases will appear when complete.",
          },
        ),
        specimen(
          "stripe-sign-in",
          "Sign in to finish a purchase",
          "Sign in required",
          {
            description:
              "Sign in to finish linking your purchase to your account.",
            variant: "destructive",
          },
        ),
        specimen(
          "stripe-complete",
          "Purchase complete",
          "Purchase complete",
          { description: stripeItemLine, success: true },
        ),
        specimen(
          "stripe-complete-insight",
          "Purchase complete, first Insight gift",
          "Purchase complete",
          { description: `${stripeItemLine} ${insightLine}`, success: true },
        ),
        specimen(
          "stripe-verify-failed",
          "Payment could not be confirmed",
          "Verification failed",
          {
            description:
              "We could not confirm your payment. If you were charged, contact support.",
            variant: "destructive",
          },
        ),
        specimen(
          "stripe-verify-offline",
          "Payment server unreachable",
          "Verification failed",
          {
            description:
              "Could not reach the server. Check your connection and your purchases in the shop.",
            variant: "destructive",
          },
        ),
      ],
    },
    {
      title: "Account",
      specimens: [
        specimen(
          "auth-signed-in",
          "Signed in",
          t("auth.signedInTitle"),
          { description: t("auth.signedInDesc"), success: true },
        ),
        specimen(
          "auth-reset-sent",
          "Password reset email sent",
          t("auth.resetSent"),
          { description: t("auth.resetSentDesc"), success: true },
        ),
        specimen("profile-signed-out", "Signed out", t("profile.signedOut"), {
          success: true,
        }),
        specimen("profile-sign-out-error", "Sign out failed", t("profile.signOutError"), {
          variant: "destructive",
        }),
        specimen("profile-saved", "Game saved", t("profile.gameSaved"), {
          success: true,
        }),
        specimen(
          "profile-cloud-failed",
          "Saved on this device, cloud sync failed",
          t("profile.cloudSaveFailed"),
          { variant: "destructive" },
        ),
        specimen("profile-save-failed", "Save failed", t("profile.saveFailed"), {
          variant: "destructive",
        }),
        specimen(
          "profile-account-deleted",
          "Account deleted",
          t("profile.accountDeleted"),
          { description: t("profile.accountDeletedDesc"), success: true },
        ),
        specimen(
          "profile-delete-failed",
          "Account delete failed",
          t("profile.deleteAccountFailed"),
          {
            description: t("profile.tryAgainLater"),
            variant: "destructive",
          },
        ),
        specimen(
          "profile-not-signed-in",
          "Not signed in",
          t("profile.notSignedIn"),
          { variant: "destructive" },
        ),
        specimen(
          "profile-subscribed",
          "Subscribed to email",
          t("profile.subscribed"),
          { description: t("profile.subscribedDesc"), success: true },
        ),
        specimen(
          "profile-unsubscribed",
          "Unsubscribed from email",
          t("profile.unsubscribed"),
          { description: t("profile.unsubscribedDesc"), success: true },
        ),
        specimen(
          "profile-preference-failed",
          "Email preference failed",
          t("profile.preferenceUpdateFailed"),
          {
            description: t("profile.tryAgainLater"),
            variant: "destructive",
          },
        ),
      ],
    },
    {
      title: "Invite",
      specimens: [
        specimen(
          "invite-copied",
          "Invite link copied",
          t("invite.linkCopied"),
          {
            description: t("invite.linkCopiedDesc", {
              amount: REFERRAL_REWARD_GOLD,
            }),
            success: true,
          },
        ),
        specimen(
          "invite-needs-sign-in",
          "Invite copy needs sign-in",
          t("invite.copyFailedNotSignedIn"),
          { variant: "destructive" },
        ),
        specimen(
          "invite-copy-failed",
          "Invite link copy failed",
          t("invite.copyFailed"),
          { variant: "destructive" },
        ),
      ],
    },
    {
      title: "Share",
      specimens: [
        specimen(
          "share-unavailable",
          "Sharing is not available",
          t("share.shareUnavailableTitle"),
          {
            description: t("share.shareUnavailableDesc"),
            variant: "destructive",
          },
        ),
        specimen(
          "share-image-failed",
          "Share image failed",
          t("share.errorTitle"),
          {
            description: t("share.errorDesc"),
            variant: "destructive",
          },
        ),
        specimen("share-saved", "Share image saved", t("share.savedTitle"), {
          success: true,
        }),
        specimen("share-copied", "Share image copied", t("share.copiedTitle"), {
          success: true,
        }),
        specimen(
          "share-copy-failed",
          "Share image copy failed",
          t("share.copyErrorTitle"),
          {
            description: t("share.copyErrorDesc"),
            variant: "destructive",
          },
        ),
      ],
    },
    {
      title: "Leaderboard",
      specimens: [
        specimen(
          "leaderboard-load-failed",
          "Leaderboard failed to load",
          t("common:status.error"),
          {
            description: t("leaderboard.loadFailed"),
            variant: "destructive",
          },
        ),
        specimen(
          "leaderboard-username-empty",
          "Username empty",
          t("leaderboard.invalidUsername"),
          {
            description: t("leaderboard.usernameEmpty"),
            variant: "destructive",
          },
        ),
        specimen(
          "leaderboard-username-long",
          "Username too long",
          t("leaderboard.invalidUsername"),
          {
            description: t("leaderboard.usernameTooLong"),
            variant: "destructive",
          },
        ),
        specimen(
          "leaderboard-username-sign-in",
          "Username needs sign-in",
          t("common:status.error"),
          {
            description: t("leaderboard.mustSignIn"),
            variant: "destructive",
          },
        ),
        specimen(
          "leaderboard-username-blocked",
          "Username not allowed",
          t("leaderboard.usernameNotAllowed"),
          {
            description: t("leaderboard.usernameInappropriate"),
            variant: "destructive",
          },
        ),
        specimen(
          "leaderboard-username-taken",
          "Username taken",
          t("leaderboard.usernameTaken"),
          {
            description: t("leaderboard.usernameTakenDesc"),
            variant: "destructive",
          },
        ),
        specimen(
          "leaderboard-username-saved",
          "Username saved",
          t("leaderboard.usernameSaved"),
          { description: t("leaderboard.usernameSavedDesc"), success: true },
        ),
        specimen(
          "leaderboard-username-save-failed",
          "Username save failed",
          t("common:status.error"),
          {
            description: t("leaderboard.saveFailed"),
            variant: "destructive",
          },
        ),
      ],
    },
    {
      title: "Reset password",
      specimens: [
        specimen(
          "reset-link-invalid",
          "Reset link invalid",
          "Invalid or expired reset link",
          {
            description: "Please request a new password reset link.",
            variant: "destructive",
          },
        ),
        specimen(
          "reset-mismatch",
          "Passwords do not match",
          "Passwords do not match",
          {
            description: "Please make sure both passwords are the same.",
            variant: "destructive",
          },
        ),
        specimen(
          "reset-too-short",
          "Password too short",
          "Password too short",
          {
            description: "Password must be at least 6 characters long.",
            variant: "destructive",
          },
        ),
        specimen(
          "reset-updated",
          "Password updated",
          "Password updated successfully",
          {
            description: "You can now sign in with your new password.",
            success: true,
          },
        ),
        specimen("reset-update-failed", "Password update failed", "Error", {
          description: "Failed to update password",
          variant: "destructive",
        }),
      ],
    },
  ];
}
