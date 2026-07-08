/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import React, { useRef, useState } from "react";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS } from "@/components/game/BuildingActionBadge";
import { INSIGHT_REVEAL_DURATION_MS } from "@/game/rules/insightReveal";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => true),
}));

const upgradeSpy = vi.fn();

function CapUpgradeBadgeFixture() {
  const affordable = true;
  const [playingUntil, setPlayingUntil] = useState(0);
  const upgradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playing = playingUntil > Date.now();
  const isDisabled = !affordable || playing;

  const handleClick = () => {
    if (isDisabled) return;
    setPlayingUntil(Date.now() + INSIGHT_REVEAL_DURATION_MS);
    upgradeTimerRef.current = setTimeout(() => {
      upgradeSpy();
    }, INSIGHT_REVEAL_DURATION_MS);
  };

  return (
    <TooltipWrapper
      tooltip={<div>Improve for 100 Insight</div>}
      tooltipId="villager-cap-upgrade-grandHunterLodge"
      disabled={isDisabled}
      tooltipTriggerAsChild
      tooltipTriggerClassName={INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS}
      className="inline-flex shrink-0 items-center self-center"
    >
      <button
        type="button"
        aria-label="Improve for 100 Insight"
        disabled={isDisabled}
        data-testid="cap-upgrade-button"
        onClick={handleClick}
      >
        upgrade
      </button>
    </TooltipWrapper>
  );
}

describe("BuildingCapUpgradeBadge mobile touch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    upgradeSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("short tap applies upgrade via native button click", async () => {
    render(<CapUpgradeBadgeFixture />);

    const button = document.querySelector(
      '[data-testid="cap-upgrade-button"]',
    )!;

    await act(async () => {
      fireEvent.click(button);
    });

    await act(async () => {
      vi.advanceTimersByTime(INSIGHT_REVEAL_DURATION_MS + 100);
    });

    expect(upgradeSpy).toHaveBeenCalledTimes(1);
  });
});
