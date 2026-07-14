/** Public SPA routes and server-side HTML head metadata (SEO / crawlers). */

export const SITE_ORIGIN = "https://a-dark-cave.com";

export const HOME_SEO = {
  title: "A Dark Cave - Survive the Darkness, Build Your Settlement",
  description:
    "A text-based survival and settlement building game. Start with nothing, explore an ancient cave and build your way to survival. Gather resources, craft tools, manage villagers, and uncover dark secrets.",
} as const;

export type PublicRouteSeo = {
  title: string;
  description: string;
  /** When true, keep homepage game JSON-LD blocks in index.html. */
  includeHomeJsonLd: boolean;
  robots?: string;
  /** Short page label for WebPage / Breadcrumb JSON-LD on non-home routes. */
  pageName?: string;
};

/** Paths served by the client router (exact match after normalization). */
export const KNOWN_SPA_PATHS = new Set([
  "/",
  "/galaxy",
  "/boost",
  "/game",
  "/end-screen",
  "/imprint",
  "/privacy",
  "/terms",
  "/withdrawal",
  "/unsubscribe",
  "/reset-password",
  "/admin/dashboard",
  "/dev/starship-shader",
  "/dev/animations",
  "/dev/combat-dialog",
  "/dev/estate-bar-upgrade",
]);

const HOME_ROUTE_SEO: PublicRouteSeo = {
  title: HOME_SEO.title,
  description: HOME_SEO.description,
  includeHomeJsonLd: true,
};

const ROUTE_SEO: Record<string, PublicRouteSeo> = {
  "/": HOME_ROUTE_SEO,
  "/galaxy": HOME_ROUTE_SEO,
  "/boost": HOME_ROUTE_SEO,
  "/game": HOME_ROUTE_SEO,
  "/privacy": {
    title: "Privacy Policy - A Dark Cave",
    description:
      "Privacy Policy for A Dark Cave. Learn how we handle your data in our text-based survival and settlement building game.",
    includeHomeJsonLd: false,
    pageName: "Privacy Policy",
  },
  "/terms": {
    title: "Terms of Service - A Dark Cave",
    description: "Terms of Service for A Dark Cave.",
    includeHomeJsonLd: false,
    pageName: "Terms of Service",
  },
  "/imprint": {
    title: "Imprint - A Dark Cave",
    description: "Imprint and legal information for A Dark Cave.",
    includeHomeJsonLd: false,
    pageName: "Imprint",
  },
  "/withdrawal": {
    title: "Right of Withdrawal - A Dark Cave",
    description: "Right of Withdrawal information for A Dark Cave.",
    includeHomeJsonLd: false,
    pageName: "Right of Withdrawal",
  },
  "/unsubscribe": {
    title: "Unsubscribe — A Dark Cave",
    description: "Unsubscribe from A Dark Cave marketing emails.",
    includeHomeJsonLd: false,
    robots: "noindex, nofollow",
    pageName: "Unsubscribe",
  },
  "/reset-password": {
    title: "Reset Password - A Dark Cave",
    description: "Reset your A Dark Cave account password.",
    includeHomeJsonLd: false,
    robots: "noindex, nofollow",
    pageName: "Reset Password",
  },
  "/end-screen": {
    title: "End Screen - A Dark Cave",
    description: "Game completion screen for A Dark Cave.",
    includeHomeJsonLd: false,
    robots: "noindex",
    pageName: "End Screen",
  },
  "/admin/dashboard": {
    title: "Admin Dashboard - A Dark Cave",
    description: "Internal admin dashboard for A Dark Cave.",
    includeHomeJsonLd: false,
    robots: "noindex, nofollow",
    pageName: "Admin Dashboard",
  },
  "/dev/starship-shader": {
    title: "Starship Shader Demo - A Dark Cave",
    description: "Development preview for A Dark Cave visual effects.",
    includeHomeJsonLd: false,
    robots: "noindex, nofollow",
    pageName: "Starship Shader Demo",
  },
  "/dev/animations": {
    title: "Animations Demo - A Dark Cave",
    description: "Development preview for A Dark Cave UI animations.",
    includeHomeJsonLd: false,
    robots: "noindex, nofollow",
    pageName: "Animations Demo",
  },
  "/dev/combat-dialog": {
    title: "Combat Dialog Demo - A Dark Cave",
    description: "Development preview for A Dark Cave combat UI.",
    includeHomeJsonLd: false,
    robots: "noindex, nofollow",
    pageName: "Combat Dialog Demo",
  },
  "/dev/estate-bar-upgrade": {
    title: "Animations Demo - A Dark Cave",
    description: "Development preview for A Dark Cave UI animations.",
    includeHomeJsonLd: false,
    robots: "noindex, nofollow",
    pageName: "Animations Demo",
  },
};

export const NOT_FOUND_SEO: PublicRouteSeo = {
  title: "Page Not Found - A Dark Cave",
  description: "The requested page could not be found on A Dark Cave.",
  includeHomeJsonLd: false,
  robots: "noindex, nofollow",
  pageName: "Page Not Found",
};

export function normalizePublicPath(pathname: string): string {
  const bare = (pathname.split("?")[0] ?? "/").trim();
  if (!bare || bare === "/") return "/";
  const withLeading = bare.startsWith("/") ? bare : `/${bare}`;
  return withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
}

export function isKnownSpaPath(pathname: string): boolean {
  return KNOWN_SPA_PATHS.has(normalizePublicPath(pathname));
}

export function isStaticAssetPath(pathname: string): boolean {
  const reqPath = normalizePublicPath(pathname);
  return (
    reqPath.startsWith("/assets/") ||
    /\.[a-f0-9]{8,}\.(js|css|mjs)$/i.test(reqPath) ||
    /\.(js|css|mjs|woff2?|ttf|otf|png|jpg|svg|ico|webp|br|gz)$/i.test(reqPath)
  );
}

export function getPublicRouteSeo(pathname: string): PublicRouteSeo | null {
  const path = normalizePublicPath(pathname);
  return ROUTE_SEO[path] ?? null;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildRouteJsonLd(path: string, seo: PublicRouteSeo): string {
  const url = `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
  const payload = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: seo.pageName ?? seo.title,
    url,
    description: seo.description,
    isPartOf: {
      "@type": "WebSite",
      name: "A Dark Cave",
      url: SITE_ORIGIN,
    },
    ...(path !== "/" && {
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_ORIGIN,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: seo.pageName ?? seo.title,
            item: url,
          },
        ],
      },
    }),
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  return html.replace(pattern, replacement);
}

/**
 * Patch the SPA index.html shell for a public route before sending to crawlers.
 * @param notFound When true, apply 404 metadata (still boots the SPA for UX).
 */
export function customizeSpaIndexHtml(
  html: string,
  pathname: string,
  options?: { notFound?: boolean },
): string {
  const path = normalizePublicPath(pathname);
  const seo = options?.notFound
    ? NOT_FOUND_SEO
    : (getPublicRouteSeo(path) ?? NOT_FOUND_SEO);
  const canonical = options?.notFound
    ? `${SITE_ORIGIN}${path}`
    : `${SITE_ORIGIN}${path === "/" ? "/" : path}`;

  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const canonicalUrl = escapeHtml(canonical);

  let out = html;
  out = replaceTag(out, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  out = replaceTag(
    out,
    /<meta name="title" content="[^"]*"\s*\/?>/,
    `<meta name="title" content="${title}" />`,
  );
  out = replaceTag(
    out,
    /<meta name="description"[\s\S]*?\/?>/,
    `<meta name="description" content="${description}" />`,
  );
  out = replaceTag(
    out,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonicalUrl}" />`,
  );
  out = replaceTag(
    out,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonicalUrl}" />`,
  );
  out = replaceTag(
    out,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
  );
  out = replaceTag(
    out,
    /<meta property="og:description"[\s\S]*?\/?>/,
    `<meta property="og:description" content="${description}" />`,
  );
  out = replaceTag(
    out,
    /<meta name="twitter:url" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:url" content="${canonicalUrl}" />`,
  );
  out = replaceTag(
    out,
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  out = replaceTag(
    out,
    /<meta name="twitter:description"[\s\S]*?\/?>/,
    `<meta name="twitter:description" content="${description}" />`,
  );

  if (seo.robots) {
    const robots = escapeHtml(seo.robots);
    out = replaceTag(
      out,
      /<meta name="robots" content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${robots}" />`,
    );
  }

  if (!seo.includeHomeJsonLd) {
    out = out.replace(
      /<!-- adc:jsonld-home -->[\s\S]*?<!-- \/adc:jsonld-home -->/,
      "",
    );
  }

  out = out.replace(
    /<!-- adc:jsonld-route -->[\s\S]*?<!-- \/adc:jsonld-route -->/,
    "",
  );

  if (!seo.includeHomeJsonLd) {
    const routeJsonLd = buildRouteJsonLd(path, seo);
    out = out.replace(
      "</head>",
      `  <!-- adc:jsonld-route -->\n  ${routeJsonLd}\n  <!-- /adc:jsonld-route -->\n</head>`,
    );
  }

  return out;
}

export function resolveSpaHtmlResponse(pathname: string): {
  status: number;
  seo: PublicRouteSeo;
  notFound: boolean;
} {
  if (!isKnownSpaPath(pathname)) {
    return { status: 404, seo: NOT_FOUND_SEO, notFound: true };
  }
  const seo = getPublicRouteSeo(pathname)!;
  return { status: 200, seo, notFound: false };
}
