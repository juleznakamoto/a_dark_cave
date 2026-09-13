import { describe, expect, it } from "vitest";
import { canUseSupabase } from "@/lib/supabase";

describe("canUseSupabase", () => {
  it("is true in unit tests so auth helpers stay reachable", () => {
    expect(import.meta.env.MODE).not.toBe("development");
    expect(canUseSupabase()).toBe(true);
  });
});
