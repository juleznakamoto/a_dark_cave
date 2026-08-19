import { afterEach, describe, expect, it, vi } from "vitest";

async function loadInviteFriendsMenuItem() {
  return import("./InviteFriendsMenuItem");
}

describe("shouldShowInviteFriendsMenuItem", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("hides invite copy on Galaxy where auth and referrals are disabled", async () => {
    vi.stubGlobal("window", {
      location: { pathname: "/galaxy" },
    });
    const { shouldShowInviteFriendsMenuItem } = await loadInviteFriendsMenuItem();
    expect(shouldShowInviteFriendsMenuItem()).toBe(false);
  });

  it("hides invite copy on CrazyGames", async () => {
    vi.stubGlobal("window", {
      location: { pathname: "/crazygames" },
    });
    const { shouldShowInviteFriendsMenuItem } = await loadInviteFriendsMenuItem();
    expect(shouldShowInviteFriendsMenuItem()).toBe(false);
  });

  it("shows invite copy on the public web path", async () => {
    vi.stubGlobal("window", {
      location: { pathname: "/" },
    });
    const { shouldShowInviteFriendsMenuItem } = await loadInviteFriendsMenuItem();
    expect(shouldShowInviteFriendsMenuItem()).toBe(true);
  });
});
