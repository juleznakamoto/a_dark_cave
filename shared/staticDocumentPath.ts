/** Direct-visit document routes: first-HTML is the page; the game SPA does not boot. */
export const STATIC_DOCUMENT_PATHS = [
  "/faq",
  "/about",
  "/press",
  "/privacy",
  "/terms",
  "/imprint",
  "/withdrawal",
] as const;

export type StaticDocumentPath = (typeof STATIC_DOCUMENT_PATHS)[number];

function normalizeDocumentPath(pathname: string): string {
  const bare = (pathname.split("?")[0] ?? "/").trim();
  if (!bare || bare === "/") return "/";
  const withLeading = bare.startsWith("/") ? bare : `/${bare}`;
  return withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
}

export function isStaticDocumentPath(pathname: string): boolean {
  return (STATIC_DOCUMENT_PATHS as readonly string[]).includes(
    normalizeDocumentPath(pathname),
  );
}
