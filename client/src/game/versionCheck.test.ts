/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const editionMocks = vi.hoisted(() => ({
  isLocalOnlyEdition: vi.fn(() => false),
}));

vi.mock("@/lib/edition", () => ({
  isLocalOnlyEdition: () => editionMocks.isLocalOnlyEdition(),
}));

import {
  MAX_HARD_RELOAD_ATTEMPTS,
  __checkVersionForTests,
  __resetVersionCheckForTests,
  __setRunningBuildShaForTests,
  getUpdateReloadAttemptCount,
  isAutoReloadAllowed,
  recordUpdateHardReloadAttempt,
  startVersionCheck,
  stopVersionCheck,
  type VersionUpdateInfo,
} from "./versionCheck";

function mockVersionApi(sha: string | null, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      json: async () => (sha ? { sha } : {}),
    })),
  );
}

describe("versionCheck reload retries", () => {
  beforeEach(() => {
    sessionStorage.clear();
    editionMocks.isLocalOnlyEdition.mockReturnValue(false);
    __resetVersionCheckForTests();
    __setRunningBuildShaForTests("running-old");
  });

  afterEach(() => {
    __resetVersionCheckForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("detection does not increment attempt count", async () => {
    mockVersionApi("deployed-new");
    const callback = vi.fn(async (_info: VersionUpdateInfo) => { });
    startVersionCheck(callback);

    await __checkVersionForTests();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({
      serverSha: "deployed-new",
      autoReloadAllowed: true,
    });
    expect(getUpdateReloadAttemptCount("deployed-new")).toBe(0);
  });

  it("records hardReload attempts separately from detection", () => {
    expect(getUpdateReloadAttemptCount("deployed-new")).toBe(0);
    expect(recordUpdateHardReloadAttempt("deployed-new")).toBe(1);
    expect(recordUpdateHardReloadAttempt("deployed-new")).toBe(2);
    expect(getUpdateReloadAttemptCount("deployed-new")).toBe(2);
    expect(getUpdateReloadAttemptCount("other-sha")).toBe(0);
  });

  it("re-arms callback after stop/start when still stale and no hardReload yet", async () => {
    mockVersionApi("deployed-new");
    const first = vi.fn(async (_info: VersionUpdateInfo) => { });
    startVersionCheck(first);
    await __checkVersionForTests();
    expect(first).toHaveBeenCalledTimes(1);

    // Same mount would no-op; remount clears in-memory armed flag.
    stopVersionCheck();
    const second = vi.fn(async (_info: VersionUpdateInfo) => { });
    startVersionCheck(second);
    await __checkVersionForTests();

    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith({
      serverSha: "deployed-new",
      autoReloadAllowed: true,
    });
    expect(getUpdateReloadAttemptCount("deployed-new")).toBe(0);
  });

  it("does not double-fire while still armed for the same server sha", async () => {
    mockVersionApi("deployed-new");
    const callback = vi.fn(async (_info: VersionUpdateInfo) => { });
    startVersionCheck(callback);

    await __checkVersionForTests();
    await __checkVersionForTests();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("reports autoReloadAllowed false after max hardReloads for same sha", async () => {
    mockVersionApi("deployed-new");
    for (let i = 0; i < MAX_HARD_RELOAD_ATTEMPTS; i += 1) {
      recordUpdateHardReloadAttempt("deployed-new");
    }
    expect(isAutoReloadAllowed("deployed-new")).toBe(false);

    const callback = vi.fn(async (_info: VersionUpdateInfo) => { });
    startVersionCheck(callback);
    await __checkVersionForTests();

    expect(callback).toHaveBeenCalledWith({
      serverSha: "deployed-new",
      autoReloadAllowed: false,
    });
  });

  it("clears attempt state when server sha matches running build", async () => {
    recordUpdateHardReloadAttempt("deployed-new");
    expect(getUpdateReloadAttemptCount("deployed-new")).toBe(1);

    __setRunningBuildShaForTests("deployed-new");
    mockVersionApi("deployed-new");
    const callback = vi.fn(async (_info: VersionUpdateInfo) => { });
    startVersionCheck(callback);
    await __checkVersionForTests();

    expect(callback).not.toHaveBeenCalled();
    expect(getUpdateReloadAttemptCount("deployed-new")).toBe(0);
  });

  it("starts a fresh count for a different server sha", () => {
    recordUpdateHardReloadAttempt("sha-a");
    recordUpdateHardReloadAttempt("sha-a");
    expect(getUpdateReloadAttemptCount("sha-a")).toBe(2);

    expect(getUpdateReloadAttemptCount("sha-b")).toBe(0);
    expect(recordUpdateHardReloadAttempt("sha-b")).toBe(1);
    expect(getUpdateReloadAttemptCount("sha-a")).toBe(0);
    expect(getUpdateReloadAttemptCount("sha-b")).toBe(1);
    expect(isAutoReloadAllowed("sha-b")).toBe(true);
  });

  it("clears in-memory arm on callback failure so detection can retry", async () => {
    mockVersionApi("deployed-new");
    const failing = vi.fn(async () => {
      throw new Error("save failed");
    });
    startVersionCheck(failing);
    await __checkVersionForTests();
    expect(failing).toHaveBeenCalledTimes(1);

    const retry = vi.fn(async (_info: VersionUpdateInfo) => { });
    // Replace callback without stop (same mount path after failed arm).
    startVersionCheck(retry);
    await __checkVersionForTests();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(getUpdateReloadAttemptCount("deployed-new")).toBe(0);
  });

  it("skips checks for local/dev running sha", async () => {
    __setRunningBuildShaForTests("dev");
    mockVersionApi("deployed-new");
    const callback = vi.fn(async (_info: VersionUpdateInfo) => { });
    startVersionCheck(callback);
    await __checkVersionForTests();
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not fetch /api/version on Steam / CrazyGames", async () => {
    editionMocks.isLocalOnlyEdition.mockReturnValue(true);
    mockVersionApi("deployed-new");
    const callback = vi.fn(async (_info: VersionUpdateInfo) => { });
    startVersionCheck(callback);
    await __checkVersionForTests();
    expect(callback).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
