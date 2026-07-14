import { describe, it, expect } from "vitest";
import {
  customizeSpaIndexHtml,
  getPublicRouteSeo,
  isKnownSpaPath,
  isStaticAssetPath,
  normalizePublicPath,
  resolveSpaHtmlResponse,
  HOME_SEO,
} from "./publicSeo";

const SAMPLE_HTML = `<!doctype html>
<html>
<head>
  <title>A Dark Cave</title>
  <meta name="title" content="A Dark Cave" />
  <meta name="description" content="Home description" />
  <meta name="robots" content="index, follow" />
  <meta property="og:url" content="https://a-dark-cave.com/" />
  <meta property="og:title" content="A Dark Cave" />
  <meta property="og:description" content="Home og" />
  <meta name="twitter:url" content="https://a-dark-cave.com/" />
  <meta name="twitter:title" content="A Dark Cave" />
  <meta name="twitter:description" content="Home twitter" />
  <link rel="canonical" href="https://a-dark-cave.com/" />
  <!-- adc:jsonld-home -->
  <script type="application/ld+json">{"@type":"VideoGame"}</script>
  <!-- /adc:jsonld-home -->
</head>
<body></body>
</html>`;

describe("publicSeo", () => {
  it("normalizes paths", () => {
    expect(normalizePublicPath("/privacy/")).toBe("/privacy");
    expect(normalizePublicPath("privacy")).toBe("/privacy");
    expect(normalizePublicPath("/")).toBe("/");
  });

  it("detects known vs unknown SPA paths", () => {
    expect(isKnownSpaPath("/privacy")).toBe(true);
    expect(isKnownSpaPath("/not-a-real-page")).toBe(false);
  });

  it("detects static asset paths", () => {
    expect(isStaticAssetPath("/assets/index-abc123.js")).toBe(true);
    expect(isStaticAssetPath("/privacy")).toBe(false);
  });

  it("returns 404 resolution for unknown routes", () => {
    expect(resolveSpaHtmlResponse("/fake-url").status).toBe(404);
    expect(resolveSpaHtmlResponse("/fake-url").notFound).toBe(true);
  });

  it("returns 200 for known routes", () => {
    expect(resolveSpaHtmlResponse("/privacy").status).toBe(200);
  });

  it("customizes legal page metadata and strips home JSON-LD", () => {
    const privacy = getPublicRouteSeo("/privacy")!;
    const html = customizeSpaIndexHtml(SAMPLE_HTML, "/privacy");
    expect(html).toContain(`<title>${privacy.title}</title>`);
    expect(html).toContain(`href="https://a-dark-cave.com/privacy"`);
    expect(html).not.toContain("VideoGame");
    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('"Privacy Policy"');
  });

  it("keeps home JSON-LD on landing routes", () => {
    const html = customizeSpaIndexHtml(SAMPLE_HTML, "/");
    expect(html).toContain("VideoGame");
    expect(html).toContain(`<title>${HOME_SEO.title}</title>`);
    expect(html).not.toContain('"@type":"WebPage"');
  });

  it("customizes 404 metadata", () => {
    const html = customizeSpaIndexHtml(SAMPLE_HTML, "/missing", {
      notFound: true,
    });
    expect(html).toContain("<title>Page Not Found - A Dark Cave</title>");
    expect(html).toContain('content="noindex, nofollow"');
    expect(html).not.toContain("VideoGame");
  });
});
