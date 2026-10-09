/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { SAVE_QUARANTINE_NOTICE_KEY } from "@/game/save";

const {
  escapeFailedGameBoot,
  runGameplayInitialization,
  clearStaleChunkReloadGuard,
  setShopDialogOpen,
} = vi.hoisted(() => ({
  escapeFailedGameBoot: vi.fn(),
  runGameplayInitialization: vi.fn(),
  clearStaleChunkReloadGuard: vi.fn(),
  setShopDialogOpen: vi.fn(),
}));

vi.mock("@/game/state", () => ({
  useGameStore: (selector: (state: { setShopDialogOpen: () => void }) => unknown) =>
    selector({ setShopDialogOpen }),
}));
vi.mock("@/game/loop", () => ({ stopGameLoop: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/sessionTracker", () => ({ initSessionTracker: vi.fn() }));
vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isLocalOnlyEdition: () => true,
  };
});
vi.mock("@/hooks/useSteamEditionActive", () => ({
  useSteamEditionActive: () => true,
}));
vi.mock("@/components/ui/page-load-spinner", () => ({
  default: () => <div data-testid="page-load-spinner" />,
}));
vi.mock("@/lib/hardReload", () => ({
  clearStaleChunkReloadGuard,
}));
vi.mock("@/lib/fatalErrorScreen", () => ({
  escapeFailedGameBoot,
}));
vi.mock("@/game/gameplayInitOrchestrator", () => ({
  runGameplayInitialization,
}));
vi.mock("@/components/game/GameContainer", () => ({
  default: () => <div data-testid="game-container" />,
}));
vi.mock("@/components/game/gameChrome", () => ({
  DestroyedChromeScope: ({ children }: { children: ReactNode }) => children,
}));

import Game from "./game";

describe("game boot failure", () => {
  beforeEach(async () => {
    escapeFailedGameBoot.mockClear();
    clearStaleChunkReloadGuard.mockClear();
    runGameplayInitialization.mockReset();
    sessionStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("sends a thrown startup to the title and does not re-arm chunk reload", async () => {
    runGameplayInitialization.mockRejectedValue(new Error("init failed"));
    render(<Game />);

    await waitFor(() => {
      expect(escapeFailedGameBoot).toHaveBeenCalledTimes(1);
    });
    expect(clearStaleChunkReloadGuard).not.toHaveBeenCalled();
    expect(screen.queryByTestId("save-quarantine-notice")).toBeNull();
  });

  it("shows the kept-save notice only after a finished boot", async () => {
    runGameplayInitialization.mockResolvedValue({
      background: Promise.resolve(),
      openShop: false,
      openNewGame: false,
      showEmailConfirmedDialog: false,
    });
    sessionStorage.setItem(SAVE_QUARANTINE_NOTICE_KEY, "1");

    render(
      <I18nextProvider i18n={i18n}>
        <Game />
      </I18nextProvider>,
    );

    expect(await screen.findByTestId("save-quarantine-notice")).toHaveTextContent(
      "new game",
    );
    expect(clearStaleChunkReloadGuard).toHaveBeenCalledTimes(1);
    expect(escapeFailedGameBoot).not.toHaveBeenCalled();
  });
});
