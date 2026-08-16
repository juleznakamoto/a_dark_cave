import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/apiUrl";

export const INVITE_NOT_SIGNED_IN_ERROR = "Not signed in";

/** Where the player copied an invite URL. Ids land in `button_clicks` as `copy-invite-{source}`. */
export const COPY_INVITE_SOURCES = ["rewards", "share", "floating"] as const;
export type CopyInviteLinkSource = (typeof COPY_INVITE_SOURCES)[number];

export function copyInviteButtonId(source: CopyInviteLinkSource): string {
  return `copy-invite-${source}`;
}

export function isInviteNotSignedInError(error: unknown): boolean {
  return error instanceof Error && error.message === INVITE_NOT_SIGNED_IN_ERROR;
}

function trackCopyInviteClick(source: CopyInviteLinkSource): void {
  const buttonId = copyInviteButtonId(source);
  void import("@/game/state")
    .then(({ useGameStore }) => {
      useGameStore.getState().trackButtonClick(buttonId);
    })
    .catch(() => {
      // Opening / copying the link must not fail if analytics is unavailable.
    });
}

export async function copyInviteLinkToClipboard(
  source: CopyInviteLinkSource,
): Promise<string> {
  trackCopyInviteClick(source);

  const supabase = await getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error(INVITE_NOT_SIGNED_IN_ERROR);
  }

  const res = await fetch(apiUrl("/api/referral/code"), {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) {
    throw new Error("Failed to load invite code");
  }
  const { referralCode } = (await res.json()) as { referralCode?: string };
  if (!referralCode) {
    throw new Error("Missing invite code");
  }

  const inviteLink = `${window.location.origin}?ref=${referralCode}`;
  await navigator.clipboard.writeText(inviteLink);
  return inviteLink;
}
