import { describe, expect, it } from "vitest";
import { parseLocaleJson } from "../client/src/i18n/parseLocaleJson";
import {
  insertMissingKeys,
  pruneExistingKeys,
  withTrailingComma,
} from "./sync-locale-keys.mjs";

describe("withTrailingComma", () => {
  it("adds a comma before a trailing // comment", () => {
    expect(withTrailingComma('    "a": "b" //x1.5')).toBe(
      '    "a": "b", //x1.5',
    );
  });

  it("leaves lines that already have a comma alone", () => {
    expect(withTrailingComma('    "a": "b", //ok')).toBe('    "a": "b", //ok');
  });
});

describe("pruneExistingKeys", () => {
  it("keeps only missing nested leaves", () => {
    const source = {
      shop: {
        paymentFailed: "Payment failed",
        tooManyPaymentRequests:
          "Too many payment requests, please try again later.",
      },
    };
    pruneExistingKeys(source, {
      shop: { paymentFailed: "Zahlung fehlgeschlagen" },
    });
    expect(source).toEqual({
      shop: {
        tooManyPaymentRequests:
          "Too many payment requests, please try again later.",
      },
    });
  });
});

describe("insertMissingKeys", () => {
  it("inserts a nested leaf inside an existing object (not a duplicate root key)", () => {
    const existing = `{
  "shop": {
    "paymentFailed": "Zahlung fehlgeschlagen", //x1.6
    "notAuthenticated": "Benutzer nicht authentifiziert" //x1.4
  }
}
`;
    const missing = {
      shop: {
        tooManyPaymentRequests:
          "Too many payment requests, please try again later.",
      },
    };

    const updated = insertMissingKeys(existing, missing);
    const parsed = parseLocaleJson(updated);

    expect(parsed).toEqual({
      shop: {
        paymentFailed: "Zahlung fehlgeschlagen",
        notAuthenticated: "Benutzer nicht authentifiziert",
        tooManyPaymentRequests:
          "Too many payment requests, please try again later.",
      },
    });
    // Regression: must not append a second top-level "shop" after the object closed.
    expect(updated.match(/"shop"\s*:/g)?.length).toBe(1);
    expect(updated).toContain("//x1.6");
    expect(updated).toContain("//x1.4");
  });

  it("adds a top-level key without breaking JSON or stripping sibling comments", () => {
    const existing = `{
  "shop": {
    "a": "1" //ok
  }
}
`;
    const updated = insertMissingKeys(existing, {
      other: { b: "2" },
    });
    expect(parseLocaleJson(updated)).toEqual({
      shop: { a: "1" },
      other: { b: "2" },
    });
    expect(updated).toContain("//ok");
  });

  it("preserves a sibling object when inserting into the first block", () => {
    const existing = `{
  "shop": {
    "a": "1"
  },
  "other": {
    "b": "2" //ok
  }
}
`;
    const updated = insertMissingKeys(existing, {
      shop: { c: "3" },
    });
    expect(parseLocaleJson(updated)).toEqual({
      shop: { a: "1", c: "3" },
      other: { b: "2" },
    });
    expect(updated).toContain("//ok");
  });
});
