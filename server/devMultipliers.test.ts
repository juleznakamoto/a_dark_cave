import { describe, expect, it } from "vitest";
import {
  buildDevMultiplierAccount,
  findAuthUserByEmail,
  findAuthUserById,
  getDevMultiplierEmailAllowlist,
  nextDevMultipliersAppMetadata,
  sessionHasDevMultipliers,
} from "./devMultipliers";

describe("server dev multiplier accounts", () => {
  it("locks env-allowlisted emails on even without metadata", () => {
    const allowlist = new Set(["live@example.com"]);
    const account = buildDevMultiplierAccount(
      { id: "u1", email: "Live@Example.com", app_metadata: {} },
      allowlist,
    );
    expect(account).toEqual({
      user_id: "u1",
      email: "Live@Example.com",
      devMultipliers: true,
      devMultipliersLockedByEnv: true,
    });
  });

  it("enables from app_metadata without locking the toggle", () => {
    const account = buildDevMultiplierAccount(
      {
        id: "u2",
        email: "player@example.com",
        app_metadata: { dev_multipliers: true },
      },
      new Set(),
    );
    expect(account.devMultipliers).toBe(true);
    expect(account.devMultipliersLockedByEnv).toBe(false);
  });

  it("merges the metadata flag onto existing app_metadata", () => {
    expect(
      nextDevMultipliersAppMetadata({ provider: "email" }, true),
    ).toEqual({
      provider: "email",
      dev_multipliers: true,
    });
    expect(nextDevMultipliersAppMetadata(null, false)).toEqual({
      dev_multipliers: false,
    });
  });

  it("finds auth users by id and email", async () => {
    const users = [
      { id: "u1", email: "one@example.com" },
      { id: "u2", email: "two@example.com" },
    ];
    const adminClient = {
      auth: {
        admin: {
          getUserById: async (id: string) => ({
            data: { user: users.find((u) => u.id === id) ?? null },
            error: null,
          }),
          listUsers: async () => ({
            data: { users },
            error: null,
          }),
        },
      },
    };

    await expect(findAuthUserById(adminClient, "u2")).resolves.toEqual(users[1]);
    await expect(findAuthUserByEmail(adminClient, "ONE@example.com")).resolves.toEqual(
      users[0],
    );
    await expect(findAuthUserByEmail(adminClient, "missing@example.com")).resolves.toBeNull();
  });

  it("includes built-in live accounts on the process allowlist", () => {
    expect(getDevMultiplierEmailAllowlist()).toContain(
      "adcplay6acee6b4@uberip.com",
    );
    expect(
      sessionHasDevMultipliers({
        email: "adcplay6acee6b4@uberip.com",
        app_metadata: {},
      }),
    ).toBe(true);
  });

  it("reads the current process allowlist for session checks", () => {
    const previous = process.env.DEV_MULTIPLIER_EMAILS;
    process.env.DEV_MULTIPLIER_EMAILS = "session@example.com";
    try {
      expect(
        sessionHasDevMultipliers({
          email: "session@example.com",
          app_metadata: {},
        }),
      ).toBe(true);
      expect(
        sessionHasDevMultipliers({
          email: "other@example.com",
          app_metadata: {},
        }),
      ).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.DEV_MULTIPLIER_EMAILS;
      } else {
        process.env.DEV_MULTIPLIER_EMAILS = previous;
      }
    }
  });
});
