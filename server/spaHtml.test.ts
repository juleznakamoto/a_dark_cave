import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { publicPathFromRequest } from "@shared/publicSeo";
import { sendSpaIndexHtml } from "./spaHtml";

const SAMPLE_HTML = `<!doctype html>
<html>
<head>
  <title>A Dark Cave - Survive the Darkness, Build Your Settlement</title>
  <meta name="title" content="A Dark Cave - Survive the Darkness, Build Your Settlement" />
  <meta name="description" content="Home description" />
  <meta name="robots" content="index, follow" />
  <meta property="og:url" content="https://a-dark-cave.com/" />
  <meta property="og:title" content="A Dark Cave - Survive the Darkness, Build Your Settlement" />
  <meta property="og:description" content="Home og" />
  <meta name="twitter:url" content="https://a-dark-cave.com/" />
  <meta name="twitter:title" content="A Dark Cave - Survive the Darkness, Build Your Settlement" />
  <meta name="twitter:description" content="Home twitter" />
  <link rel="canonical" href="https://a-dark-cave.com/" />
  <!-- adc:jsonld-home -->
  <script type="application/ld+json">{"@type":"VideoGame"}</script>
  <!-- /adc:jsonld-home -->
</head>
<body></body>
</html>`;

function spaFallbackApp() {
  const app = express();
  // Same `"*"` mount production used to use. Express then sets req.path to `/`.
  app.use("*", (req, res) => {
    sendSpaIndexHtml(res, SAMPLE_HTML, publicPathFromRequest(req));
  });
  return app;
}

describe("sendSpaIndexHtml catch-all", () => {
  it("Express app.use('*') strips req.path to /", async () => {
    const app = express();
    app.use("*", (req, res) => {
      res.json({ path: req.path, originalUrl: req.originalUrl });
    });
    const res = await request(app).get("/privacy");
    expect(res.body.path).toBe("/");
    expect(res.body.originalUrl).toBe("/privacy");
  });

  it("gives /privacy its own title, canonical, and visible privacy copy", async () => {
    const res = await request(spaFallbackApp()).get("/privacy");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>Privacy Policy - A Dark Cave</title>");
    expect(res.text).toContain(
      '<link rel="canonical" href="https://a-dark-cave.com/privacy"',
    );
    expect(res.text).not.toContain(
      '<link rel="canonical" href="https://a-dark-cave.com/"',
    );
    expect(res.text).not.toContain("VideoGame");
    expect(res.text).toContain("This Privacy Policy informs you");
    expect(res.text).not.toContain("Play for Free in Your Browser");
  });

  it("points /galaxy at the homepage canonical and noindexes it", async () => {
    const res = await request(spaFallbackApp()).get("/galaxy");
    expect(res.status).toBe(200);
    expect(res.text).toContain(
      '<link rel="canonical" href="https://a-dark-cave.com/"',
    );
    expect(res.text).not.toContain(
      '<link rel="canonical" href="https://a-dark-cave.com/galaxy"',
    );
    expect(res.text).toContain('content="noindex, follow"');
    expect(res.text).not.toContain('content="index, follow"');
    expect(res.text).toContain("VideoGame");
  });

  it("gives /faq a unique title, canonical, and visible FAQ copy", async () => {
    const res = await request(spaFallbackApp()).get("/faq");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>FAQ - A Dark Cave</title>");
    expect(res.text).toContain(
      '<link rel="canonical" href="https://a-dark-cave.com/faq"',
    );
    expect(res.text).toContain("What is A Dark Cave?");
    expect(res.text).toContain("FAQPage");
    expect(res.text).not.toContain("VideoGame");
  });

  it("returns a real 404 for unknown paths", async () => {
    const res = await request(spaFallbackApp()).get(
      "/this-page-does-not-exist-xyz",
    );
    expect(res.status).toBe(404);
    expect(res.text).toContain("<title>Page Not Found - A Dark Cave</title>");
    expect(res.text).toContain('content="noindex, nofollow"');
    expect(res.text).toContain("The darkness swallowed this page.");
    expect(res.text).not.toContain("Play for Free in Your Browser");
    expect(res.text).not.toContain("A Dark Room");
  });
});
