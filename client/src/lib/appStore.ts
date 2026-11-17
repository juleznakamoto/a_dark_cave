/**
 * App Store product page sent with the iOS share sheet.
 * Apple ID 6835755092 from App Store Connect. The page opens once the app is released.
 */
export const APP_STORE_URL = "https://apps.apple.com/app/id6835755092";

/** Share-sheet sentence plus the product link, when that link exists. */
export function withAppStoreLink(sentence: string, url = APP_STORE_URL): string {
  const link = url.trim();
  if (!link) return sentence;
  return `${sentence} ${link}`;
}
