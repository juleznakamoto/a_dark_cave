/**
 * @vitest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/game/TooltipWrapper", () => ({
  TooltipWrapper: ({ children }: { children: React.ReactElement }) => children,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: React.forwardRef(function DialogContentMock(
    {
      children,
      onPointerDownOutside: _onPointerDownOutside,
      onEscapeKeyDown: _onEscapeKeyDown,
      ...props
    }: {
      children: React.ReactNode;
      onPointerDownOutside?: unknown;
      onEscapeKeyDown?: unknown;
      [key: string]: unknown;
    },
    ref: React.Ref<HTMLDivElement>,
  ) {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/game/save", () => ({
  saveGame: vi.fn().mockResolvedValue(undefined),
}));

import GamblerDiceDialog from "./GamblerDiceDialog";
import { useGameStore } from "@/game/state";
import * as gamblerSession from "@/game/gamblerSession";
import { GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY } from "@/game/gamblerSession";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import * as diceFifteenGame from "@/game/diceFifteenGame";
import { WIN_LOSE_BOARD_HOLD_MS } from "@/components/game/WinLoseResultScreen";

describe("GamblerDiceDialog", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded();
    useGameStore.setState((s) => ({
      gamblerGame: null,
      story: {
        ...s.story,
        seen: {
          ...s.story.seen,
          [GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY]: 0,
        },
      },
    }));
    vi.useFakeTimers();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it("alternates one player roll then one NPC roll (single die on NPC turn)", () => {
    render(
      <GamblerDiceDialog
        isOpen={true}
        onOutcomeResolved={vi.fn()}
        onClose={vi.fn()}
        playerGold={100}
        playerLuck={50}
        onWagerSelected={vi.fn()}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /10 Gold/i }));
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^roll$/i }));
      vi.advanceTimersByTime(1200);
    });

    act(() => {
      vi.runOnlyPendingTimers();
    });
    act(() => {
      vi.advanceTimersByTime(500 + 1200);
    });

    const playerRunning = Number(
      screen.getByTestId("player-running-total").textContent,
    );
    const npcRunning = Number(screen.getByTestId("gambler-running-total").textContent);
    expect(playerRunning).toBeGreaterThanOrEqual(1);
    expect(playerRunning).toBeLessThanOrEqual(6);
    expect(npcRunning).toBeGreaterThanOrEqual(1);
    expect(npcRunning).toBeLessThanOrEqual(6);
    expect(screen.getByRole("button", { name: /^roll$/i })).toBeInTheDocument();
  });

  it("shows the combat-style win screen instead of the dice outcome layout", () => {
    useGameStore.setState({
      gamblerGame: {
        wager: 10,
        outcome: "win",
        outcomeSnapshot: { playerTotal: 15, npcTotal: 12, goal: 15 },
        stakeNotYetDeducted: false,
      },
    });

    render(
      <GamblerDiceDialog
        isOpen={true}
        onOutcomeResolved={vi.fn()}
        onClose={vi.fn()}
        playerGold={100}
        playerLuck={50}
        onWagerSelected={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/you win/i).length).toBeGreaterThan(0);
    expect(screen.getByText("+10 Gold")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("player-running-total")).not.toBeInTheDocument();
    expect(screen.queryByText(/the obsessed gambler/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^close$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the combat-style lose screen for a lost wager", () => {
    useGameStore.setState({
      gamblerGame: {
        wager: 25,
        outcome: "lose",
        outcomeSnapshot: { playerTotal: 16, npcTotal: 14, goal: 15 },
        stakeNotYetDeducted: false,
      },
    });

    render(
      <GamblerDiceDialog
        isOpen={true}
        onOutcomeResolved={vi.fn()}
        onClose={vi.fn()}
        playerGold={100}
        playerLuck={50}
        onWagerSelected={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/you lose/i).length).toBeGreaterThan(0);
    expect(screen.getByText("-25 Gold")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).toBeInTheDocument();
  });

  it("keeps the dice board visible 1.5s after a bust before the lose screen", () => {
    const rollDie = vi
      .spyOn(diceFifteenGame, "rollDie")
      .mockReturnValue(6);

    useGameStore.setState({
      gamblerGame: {
        wager: 10,
        stakeNotYetDeducted: false,
        session: {
          phase: "playerTurn",
          playerTotal: 14,
          npcTotal: 10,
          goal: 15,
          playerLastRoll: 4,
          npcLastRoll: 5,
          hasRolledThisRound: true,
          playerStopped: false,
          pauseAfterNextPlayerRoll: false,
        },
      },
    });

    render(
      <GamblerDiceDialog
        isOpen={true}
        onOutcomeResolved={vi.fn()}
        onClose={vi.fn()}
        playerGold={100}
        playerLuck={50}
        onWagerSelected={vi.fn()}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^roll$/i }));
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByTestId("player-running-total")).toHaveTextContent("20");
    expect(screen.queryByText(/you lose/i)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(WIN_LOSE_BOARD_HOLD_MS);
    });

    expect(screen.getAllByText(/you lose/i).length).toBeGreaterThan(0);
    rollDie.mockRestore();
  });

  function renderPaidWinAtFourteen() {
    useGameStore.setState({
      gamblerGame: {
        wager: 10,
        stakeNotYetDeducted: false,
        session: {
          phase: "playerTurn",
          playerTotal: 14,
          npcTotal: 10,
          goal: 15,
          playerLastRoll: 4,
          npcLastRoll: 5,
          hasRolledThisRound: true,
          playerStopped: false,
          pauseAfterNextPlayerRoll: false,
        },
      },
    });
    const onOutcomeResolved = vi.fn();
    render(
      <GamblerDiceDialog
        isOpen={true}
        onOutcomeResolved={onOutcomeResolved}
        onClose={vi.fn()}
        playerGold={100}
        playerLuck={50}
        onWagerSelected={vi.fn()}
      />,
    );
    return onOutcomeResolved;
  }

  it("offers one more roll after a paid win and doubles on 1 to 4", () => {
    const offer = vi
      .spyOn(gamblerSession, "gamblerDoubleOfferOnWin")
      .mockReturnValue(true);
    const rollDie = vi
      .spyOn(diceFifteenGame, "rollDie")
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(3);
    const onOutcomeResolved = renderPaidWinAtFourteen();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^roll$/i }));
      vi.advanceTimersByTime(1200 + WIN_LOSE_BOARD_HOLD_MS);
    });

    expect(
      screen.getByText(/double, or nothing/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/one to four doubles your gold/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/five or six, I keep it/i)).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /roll the die/i }));
      vi.advanceTimersByTime(5500 + 2000);
    });

    expect(screen.getByText("+20 Gold")).toBeInTheDocument();
    expect(onOutcomeResolved).toHaveBeenCalledWith(
      "win",
      10,
      expect.objectContaining({ playerTotal: 15 }),
      { goldDelta: 20 },
    );
    offer.mockRestore();
    rollDie.mockRestore();
  });

  it("takes the winnings when the extra roll is 5 or 6", () => {
    const offer = vi
      .spyOn(gamblerSession, "gamblerDoubleOfferOnWin")
      .mockReturnValue(true);
    const rollDie = vi
      .spyOn(diceFifteenGame, "rollDie")
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(6);
    const onOutcomeResolved = renderPaidWinAtFourteen();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^roll$/i }));
      vi.advanceTimersByTime(1200 + WIN_LOSE_BOARD_HOLD_MS);
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /roll the die/i }));
      vi.advanceTimersByTime(5500 + 2000);
    });

    expect(screen.getByText("⚅")).toBeInTheDocument();
    expect(screen.getByText(/you lost the roll/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /continue/i }),
    ).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).toBeInTheDocument();
    expect(onOutcomeResolved).toHaveBeenCalledWith(
      "lose",
      10,
      expect.objectContaining({ playerTotal: 15 }),
      { goldDelta: 0 },
    );
    offer.mockRestore();
    rollDie.mockRestore();
  });

  it("saves the offer as its own turn and does not hand it to the gambler", () => {
    const offer = vi
      .spyOn(gamblerSession, "gamblerDoubleOfferOnWin")
      .mockReturnValue(true);
    const rollDie = vi.spyOn(diceFifteenGame, "rollDie").mockReturnValue(1);
    renderPaidWinAtFourteen();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^roll$/i }));
      vi.advanceTimersByTime(1200);
    });

    expect(useGameStore.getState().gamblerGame?.session).toMatchObject({
      phase: "doubleOffer",
      playerTotal: 15,
      pauseAfterNextPlayerRoll: false,
    });
    expect(useGameStore.getState().gamblerGame?.outcome).toBeUndefined();
    expect(screen.queryByText(/double, or nothing/i)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(WIN_LOSE_BOARD_HOLD_MS);
    });

    expect(screen.getByText(/double, or nothing/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^roll$/i }),
    ).not.toBeInTheDocument();
    offer.mockRestore();
    rollDie.mockRestore();
  });

  it("restores a saved offer instead of the gambler's turn", () => {
    useGameStore.setState({
      gamblerGame: {
        wager: 10,
        stakeNotYetDeducted: false,
        session: {
          phase: "doubleOffer",
          playerTotal: 15,
          npcTotal: 10,
          goal: 15,
          playerLastRoll: 1,
          npcLastRoll: 5,
          hasRolledThisRound: true,
          playerStopped: false,
          pauseAfterNextPlayerRoll: false,
        },
      },
    });
    render(
      <GamblerDiceDialog
        isOpen={true}
        onOutcomeResolved={vi.fn()}
        onClose={vi.fn()}
        playerGold={100}
        playerLuck={50}
        onWagerSelected={vi.fn()}
      />,
    );

    expect(screen.getByText(/double, or nothing/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText(/double, or nothing/i)).toBeInTheDocument();
    expect(screen.queryByTestId("gambler-running-total")).not.toBeInTheDocument();
  });

  it("restores an offer that was saved as the old handoff pause", () => {
    useGameStore.setState({
      gamblerGame: {
        wager: 10,
        stakeNotYetDeducted: false,
        session: {
          phase: "playerTurn",
          playerTotal: 15,
          npcTotal: 10,
          goal: 15,
          playerLastRoll: 1,
          npcLastRoll: 5,
          hasRolledThisRound: true,
          playerStopped: false,
          pauseAfterNextPlayerRoll: true,
        },
      },
    });
    render(
      <GamblerDiceDialog
        isOpen={true}
        onOutcomeResolved={vi.fn()}
        onClose={vi.fn()}
        playerGold={100}
        playerLuck={50}
        onWagerSelected={vi.fn()}
      />,
    );

    expect(screen.getByText(/double, or nothing/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByTestId("gambler-running-total")).not.toBeInTheDocument();
    expect(useGameStore.getState().gamblerGame?.session?.phase).toBe(
      "doubleOffer",
    );
  });
});
