import { describe, expect, it } from "vitest";
import {
  STATIC_DOCUMENT_PATHS,
  isStaticDocumentPath,
} from "./staticDocumentPath";

describe("isStaticDocumentPath", () => {
  it("matches FAQ, About, Press, and legal routes", () => {
    for (const path of STATIC_DOCUMENT_PATHS) {
      expect(isStaticDocumentPath(path)).toBe(true);
      expect(isStaticDocumentPath(`${path}/`)).toBe(true);
    }
  });

  it("ignores query strings", () => {
    expect(isStaticDocumentPath("/faq?utm=1")).toBe(true);
    expect(isStaticDocumentPath("/press?ref=abc")).toBe(true);
  });

  it("leaves play and form routes to the game SPA", () => {
    expect(isStaticDocumentPath("/")).toBe(false);
    expect(isStaticDocumentPath("/galaxy")).toBe(false);
    expect(isStaticDocumentPath("/unsubscribe")).toBe(false);
    expect(isStaticDocumentPath("/reset-password")).toBe(false);
    expect(isStaticDocumentPath("/end-screen")).toBe(false);
    expect(isStaticDocumentPath("/this-page-does-not-exist-xyz")).toBe(false);
  });
});
