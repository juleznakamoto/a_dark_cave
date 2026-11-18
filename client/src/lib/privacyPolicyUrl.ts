import { isIosBuild } from "@/lib/edition";

/**
 * Public policy page. The packaged iOS app stubs `/privacy` to the game, so
 * that build must open the website. DEV iOS mode still has the local page.
 */
export const PRIVACY_POLICY_URL = "https://a-dark-cave.com/privacy";

export function privacyPolicyHref(): string {
  return isIosBuild ? PRIVACY_POLICY_URL : "/privacy";
}
