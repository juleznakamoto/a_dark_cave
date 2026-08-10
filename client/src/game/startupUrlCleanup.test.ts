/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyStartupUrlCleanup,
  consumeStartupAuthCallback,
  planStartupUrlCleanup,
} from "./startupUrlCleanup";
import { parseStartupIntent } from "./startupIntent";

const { mockGetSession, mockGetSupabaseClient } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockGetSupabaseClient = vi.fn(async () => ({
    auth: { getSession: mockGetSession },
  }));
  return { mockGetSession, mockGetSupabaseClient };
});

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

vi.mock("@/lib/edition", () => ({
  isLocalOnlyEdition: () => false,
}));

describe("startupUrlCleanup", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetSupabaseClient.mockClear();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    window.history.replaceState({}, "", "/");
  });

  it("plans auth consumption before cleanup for OAuth callbacks", () => {
    const location = {
      pathname: "/",
      search: "",
      hash: "#access_token=token-1",
    };
    const intent = parseStartupIntent(location);
    expect(intent.oauthCallback).toBe(true);
    expect(intent.forceGame).toBe(false);
    expect(planStartupUrlCleanup(location, intent)).toEqual({
      needsAuthConsumption: true,
      scopes: ["auth-callback"],
    });
  });

  it("consumes the auth callback before any URL cleanup", async () => {
    const order: string[] = [];
    mockGetSupabaseClient.mockImplementation(async () => {
      order.push("getSupabaseClient");
      return {
        auth: {
          getSession: async () => {
            order.push("getSession");
            return { data: { session: null } };
          },
        },
      };
    });

    window.history.replaceState({}, "", "/#access_token=token-1");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    await consumeStartupAuthCallback(window.location);
    expect(order).toEqual(["getSupabaseClient", "getSession"]);
    expect(replaceSpy).not.toHaveBeenCalled();

    applyStartupUrlCleanup(window.location, ["auth-callback"]);
    expect(window.location.hash).toBe("");
  });

  it("strips campaign and shop params while preserving unrelated query", () => {
    window.history.replaceState(
      {},
      "",
      "/?openShop=true&cruelHighlight=true&c=campaign-1&keep=1",
    );
    applyStartupUrlCleanup(window.location, ["campaign", "shop"]);
    expect(window.location.search).toBe("?keep=1");
  });

  it("strips UTM params under campaign scope", () => {
    window.history.replaceState(
      {},
      "",
      "/?utm_source=playlight&utm_medium=discovery&utm_campaign=exit&utm_content=x&utm_term=y&keep=1",
    );
    expect(
      planStartupUrlCleanup(window.location).scopes,
    ).toContain("campaign");
    applyStartupUrlCleanup(window.location, ["campaign"]);
    expect(window.location.search).toBe("?keep=1");
  });

  it("strips hard-reload cache bust param", () => {
    window.history.replaceState({}, "", "/?_cb=123&game=true");
    applyStartupUrlCleanup(window.location, ["hard-reload-bust"]);
    expect(window.location.search).toBe("?game=true");
  });

  it("strips Stripe return params", () => {
    window.history.replaceState(
      {},
      "",
      "/?payment_intent=pi_1&payment_intent_client_secret=sec&redirect_status=succeeded&keep=1",
    );
    applyStartupUrlCleanup(window.location, ["stripe-return"]);
    expect(window.location.search).toBe("?keep=1");
  });

  it("recognizes PKCE code as oauth callback without forcing Game", () => {
    const intent = parseStartupIntent({
      pathname: "/",
      search: "?code=pkce-code",
      hash: "",
    });
    expect(intent).toMatchObject({
      oauthCallback: true,
      forceGame: false,
    });
  });
});
