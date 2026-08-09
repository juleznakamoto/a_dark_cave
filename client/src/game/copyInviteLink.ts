import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/apiUrl";

export const INVITE_NOT_SIGNED_IN_ERROR = "Not signed in";

export function isInviteNotSignedInError(error: unknown): boolean {
  return error instanceof Error && error.message === INVITE_NOT_SIGNED_IN_ERROR;
}

export async function copyInviteLinkToClipboard(): Promise<string> {
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
