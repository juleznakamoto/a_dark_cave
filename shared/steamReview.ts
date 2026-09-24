/** Steam App IDs. Demo and playtest packages use their own steam_appid files. */
export const STEAM_FULL_APP_ID = 4882240;
export const STEAM_DEMO_APP_ID = 4971800;
export const STEAM_PLAYTEST_APP_ID = 4972040;

const REVIEW_APP_IDS: ReadonlySet<number> = new Set([
  STEAM_FULL_APP_ID,
  STEAM_DEMO_APP_ID,
  STEAM_PLAYTEST_APP_ID,
]);

/**
 * Steam store "Write a review" form.
 * Same page the store button opens (`/recommended/recommendgame/<appid>`).
 */
export function steamReviewPageUrl(appId: number): string | null {
  if (!REVIEW_APP_IDS.has(appId)) return null;
  return `https://store.steampowered.com/recommended/recommendgame/${appId}`;
}
