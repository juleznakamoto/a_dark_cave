import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { gameStateSchema } from "@shared/schema";
import { fogTooltip } from "./tooltips";

describe("fogTooltip", () => {
  it("shows a 25% production cut", () => {
    const state = gameStateSchema.parse({
      fogState: { isActive: true, endTime: Date.now() + 60_000, duration: 60_000 },
    });
    const content = fogTooltip.getContent(state);
    expect(content).not.toBeNull();
    expect(renderToStaticMarkup(content as ReactElement)).toContain("-25%");
  });
});
