import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  customizeSpaIndexHtml,
  getPublicRouteSeo,
  isKnownSpaPath,
  isStaticAssetPath,
  normalizePublicPath,
  publicPathFromRequest,
  resolveSpaHtmlResponse,
  HOME_SEO,
} from "./publicSeo";

const REAL_INDEX_HTML = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../client/index.html"),
  "utf8",
);

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

  it("reads the public path from originalUrl, not a stripped req.path", () => {
    expect(
      publicPathFromRequest({
        path: "/",
        originalUrl: "/privacy?utm=1",
      }),
    ).toBe("/privacy");
    expect(
      publicPathFromRequest({
        path: "/",
        originalUrl: "/this-page-does-not-exist-xyz",
      }),
    ).toBe("/this-page-does-not-exist-xyz");
    expect(publicPathFromRequest({ path: "/", originalUrl: "/" })).toBe("/");
  });

  it("detects known vs unknown SPA paths", () => {
    expect(isKnownSpaPath("/privacy")).toBe(true);
    expect(isKnownSpaPath("/not-a-real-page")).toBe(false);
  });

  it("detects static asset paths", () => {
    expect(isStaticAssetPath("/assets/index-abc123.js")).toBe(true);
    expect(isStaticAssetPath("/sitemap.xml")).toBe(true);
    expect(isStaticAssetPath("/robots.txt")).toBe(true);
    expect(isStaticAssetPath("/llms.txt")).toBe(true);
    expect(isStaticAssetPath("/privacy")).toBe(false);
  });

  it("keeps robots.txt to real directives only", () => {
    const robots = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../client/public/robots.txt"),
      "utf8",
    );
    expect(robots).toContain("Sitemap: https://a-dark-cave.com/sitemap.xml");
    expect(robots).not.toMatch(/LLMs-Txt/i);
    expect(REAL_INDEX_HTML).toContain(
      'rel="alternate" type="text/plain" href="https://a-dark-cave.com/llms.txt"',
    );
  });

  it("uses Markdown links in llms.txt so Lighthouse counts them", () => {
    const llms = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../client/public/llms.txt"),
      "utf8",
    );
    expect(llms).toMatch(/^# A Dark Cave\r?\n/);
    expect(llms).toMatch(/\[Play A Dark Cave\]\(https:\/\/a-dark-cave\.com\/\)/);
    expect(llms).toMatch(/\[FAQ\]\(https:\/\/a-dark-cave\.com\/faq\)/);
    expect(llms).toMatch(
      /\[Full facts\]\(https:\/\/a-dark-cave\.com\/llms-full\.txt\)/,
    );
  });

  it("returns 404 resolution for unknown routes", () => {
    expect(resolveSpaHtmlResponse("/fake-url").status).toBe(404);
    expect(resolveSpaHtmlResponse("/fake-url").notFound).toBe(true);
  });

  it("returns 200 for known routes", () => {
    expect(resolveSpaHtmlResponse("/privacy").status).toBe(200);
    expect(resolveSpaHtmlResponse("/faq").status).toBe(200);
    expect(resolveSpaHtmlResponse("/about").status).toBe(200);
    expect(resolveSpaHtmlResponse("/dev/sounds").status).toBe(200);
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

  it("points homepage clones at the home canonical and noindexes them", () => {
    for (const path of ["/galaxy", "/crazygames", "/boost"] as const) {
      const html = customizeSpaIndexHtml(SAMPLE_HTML, path);
      expect(resolveSpaHtmlResponse(path).status).toBe(200);
      expect(html).toContain(`<title>${HOME_SEO.title}</title>`);
      expect(html).toContain(
        '<link rel="canonical" href="https://a-dark-cave.com/"',
      );
      expect(html).not.toContain(
        `<link rel="canonical" href="https://a-dark-cave.com${path}"`,
      );
      expect(html).toContain('content="noindex, follow"');
      expect(html).not.toContain('content="index, follow"');
      expect(html).toContain("VideoGame");
    }
  });

  it("uses the canonical homepage title and description", () => {
    expect(HOME_SEO.title).toBe(
      "A Dark Cave - Survive the Darkness, Build Your Settlement",
    );
    expect(HOME_SEO.description).toBe(
      "A text-based incremental survival game. Light a fire, gather resources, build a settlement, and descend into the cave. Play for free in your browser. Steam demo available.",
    );
    expect(HOME_SEO.description).not.toMatch(/optional unlock/i);
    expect(HOME_SEO.description).not.toMatch(/\bIdle\b/);
  });

  it("gives legal routes unique canonicals and no home JSON-LD", () => {
    for (const path of ["/privacy", "/terms", "/imprint", "/withdrawal"] as const) {
      const seo = getPublicRouteSeo(path)!;
      const html = customizeSpaIndexHtml(SAMPLE_HTML, path);
      expect(html).toContain(`<title>${seo.title}</title>`);
      expect(html).toContain(`href="https://a-dark-cave.com${path}"`);
      expect(html).not.toContain("VideoGame");
      expect(html).not.toContain('href="https://a-dark-cave.com/"');
    }
  });

  it("customizes 404 metadata", () => {
    const html = customizeSpaIndexHtml(SAMPLE_HTML, "/missing", {
      notFound: true,
    });
    expect(html).toContain("<title>Page Not Found - A Dark Cave</title>");
    expect(html).toContain('content="noindex, nofollow"');
    expect(html).not.toContain("VideoGame");
  });

  it("patches the real index.html shell for legal pages and unknown URLs", () => {
    const home = customizeSpaIndexHtml(REAL_INDEX_HTML, "/");
    expect(resolveSpaHtmlResponse("/").status).toBe(200);
    expect(home).toContain(`<title>${HOME_SEO.title}</title>`);
    expect(home).toContain('href="https://a-dark-cave.com/"');
    expect(home).toContain("adc:jsonld-home");

    for (const path of ["/privacy", "/terms", "/imprint", "/withdrawal"] as const) {
      const seo = getPublicRouteSeo(path)!;
      const html = customizeSpaIndexHtml(REAL_INDEX_HTML, path);
      expect(resolveSpaHtmlResponse(path).status).toBe(200);
      expect(html).toContain(`<title>${seo.title}</title>`);
      expect(html).toContain(
        `<link rel="canonical" href="https://a-dark-cave.com${path}"`,
      );
      expect(html).not.toContain(
        '<link rel="canonical" href="https://a-dark-cave.com/"',
      );
      expect(html).toContain('content="index, follow"');
      expect(html).not.toContain("adc:jsonld-home");
    }

    const missing = customizeSpaIndexHtml(REAL_INDEX_HTML, "/this-page-does-not-exist-xyz", {
      notFound: true,
    });
    expect(resolveSpaHtmlResponse("/this-page-does-not-exist-xyz").status).toBe(404);
    expect(resolveSpaHtmlResponse("/blog").status).toBe(404);
    expect(missing).toContain("<title>Page Not Found - A Dark Cave</title>");
    expect(missing).toContain('content="noindex, nofollow"');
    expect(missing).not.toContain("adc:jsonld-home");
    expect(missing).not.toContain(
      '<link rel="canonical" href="https://a-dark-cave.com/"',
    );
    expect(missing).toContain("The darkness swallowed this page.");
    expect(missing).not.toContain("Play for Free in Your Browser");
    expect(missing).not.toContain("A Dark Room");
  });

  it("gives legal routes unique raw HTML with visible legal copy, not homepage marketing", () => {
    const home = customizeSpaIndexHtml(REAL_INDEX_HTML, "/");
    const privacy = customizeSpaIndexHtml(REAL_INDEX_HTML, "/privacy");
    const terms = customizeSpaIndexHtml(REAL_INDEX_HTML, "/terms");
    const imprint = customizeSpaIndexHtml(REAL_INDEX_HTML, "/imprint");
    const withdrawal = customizeSpaIndexHtml(REAL_INDEX_HTML, "/withdrawal");

    expect(privacy).not.toBe(home);
    expect(privacy).not.toBe(terms);
    expect(privacy).toContain("This Privacy Policy informs you");
    expect(privacy).toContain("Art. 15 GDPR");
    expect(privacy).toContain("Julian Bauer");
    expect(privacy).not.toContain("Play for Free in Your Browser");
    expect(privacy).not.toContain("A Dark Room");
    expect(privacy).not.toMatch(
      /<main id="seo-fallback"[^>]*style="[^"]*display:\s*none/,
    );

    expect(terms).toContain("These Terms of Service apply");
    expect(terms).toContain("Cloud Save");
    expect(terms).not.toContain("Play for Free in Your Browser");
    expect(terms).not.toContain("A Dark Room");

    expect(imprint).toContain("§ 5 TMG");
    expect(imprint).toContain("DE362802949");
    expect(imprint).not.toContain("Play for Free in Your Browser");
    expect(imprint).not.toContain("A Dark Room");

    expect(withdrawal).toContain("fourteen days without giving any reason");
    expect(withdrawal).toContain("Model Withdrawal Form");
    expect(withdrawal).not.toContain("Play for Free in Your Browser");
    expect(withdrawal).not.toContain("A Dark Room");
  });

  it("gives /faq and /about unique raw HTML with visible body copy", () => {
    const home = customizeSpaIndexHtml(REAL_INDEX_HTML, "/");
    const faq = customizeSpaIndexHtml(REAL_INDEX_HTML, "/faq");
    const about = customizeSpaIndexHtml(REAL_INDEX_HTML, "/about");

    expect(faq).not.toBe(home);
    expect(faq).not.toBe(about);
    expect(faq).toContain("<title>FAQ - A Dark Cave</title>");
    expect(faq).toContain(
      '<link rel="canonical" href="https://a-dark-cave.com/faq"',
    );
    expect(faq).toContain('content="index, follow"');
    expect(faq).toContain("What is A Dark Cave?");
    expect(faq).toContain("fully optional purchases");
    expect(faq).toContain("FAQPage");
    expect(faq).not.toContain("Who made A Dark Cave?");
    expect(faq).not.toContain("adc:jsonld-home");
    expect(faq).not.toMatch(
      /<main id="seo-fallback"[^>]*style="[^"]*display:\s*none/,
    );

    expect(about).toContain("<title>About - A Dark Cave</title>");
    expect(about).toContain(
      '<link rel="canonical" href="https://a-dark-cave.com/about"',
    );
    expect(about).toContain("text-based incremental survival and settlement game");
    expect(about).not.toContain("Julian Bauer");
    expect(about).toContain('"@type":"Organization"');
    expect(about).not.toContain("adc:jsonld-home");
  });

  it("lists /faq and /about in sitemap.xml", () => {
    const sitemap = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../client/public/sitemap.xml"),
      "utf8",
    );
    expect(sitemap).toContain("<loc>https://a-dark-cave.com/faq</loc>");
    expect(sitemap).toContain("<loc>https://a-dark-cave.com/about</loc>");
    expect(sitemap).not.toContain("a-dark-cave.com/galaxy");
    expect(sitemap).not.toContain("a-dark-cave.com/crazygames");
    expect(sitemap).not.toContain("a-dark-cave.com/boost");
  });
});
