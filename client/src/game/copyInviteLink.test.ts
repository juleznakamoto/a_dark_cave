/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COPY_INVITE_SOURCES,
  copyInviteButtonId,
  copyInviteLinkToClipboard,
  isInviteNotSignedInError,
} from "./copyInviteLink";

const { trackButtonClick, getSession } = vi.hoisted(() => ({
  trackButtonClick: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/game/state", () => ({
  useGameStore: {
    getState: () => ({
      trackButtonClick,
    }),
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(async () => ({
    auth: { getSession },
  })),
}));

vi.mock("@/lib/apiUrl", () => ({
  apiUrl: (path: string) => path,
}));

describe("copyInviteButtonId", () => {
  it("tags each invite copy source for button_clicks", () => {
    expect(copyInviteButtonId("rewards")).toBe("copy-invite-rewards");
    expect(copyInviteButtonId("share")).toBe("copy-invite-share");
    expect(copyInviteButtonId("floating")).toBe("copy-invite-floating");
    expect(COPY_INVITE_SOURCES).toEqual(["rewards", "share", "floating"]);
  });
});

describe("copyInviteLinkToClipboard analytics", () => {
  beforeEach(() => {
    trackButtonClick.mockClear();
    getSession.mockReset();
    vi.unstubAllGlobals();
  });

  it("records the click before minting a code", async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ referralCode: "AB3K9M" }),
      }),
    );
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    await copyInviteLinkToClipboard("rewards");

    await vi.waitFor(() => {
      expect(trackButtonClick).toHaveBeenCalledWith("copy-invite-rewards");
    });
  });

  it("still records the click when the player is signed out", async () => {
    getSession.mockResolvedValue({ data: { session: null } });

    await expect(copyInviteLinkToClipboard("share")).rejects.toSatisfy(
      isInviteNotSignedInError,
    );

    await vi.waitFor(() => {
      expect(trackButtonClick).toHaveBeenCalledWith("copy-invite-share");
    });
  });
});
