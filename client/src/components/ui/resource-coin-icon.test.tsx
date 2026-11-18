/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import React from "react";
import { ResourceCoinIcon } from "./resource-coin-icon";
import { ResourceInsightIcon } from "./resource-insight-icon";
import { PRECIOUS_RESOURCE_GAIN_PARTICLE_MS } from "./coin-hover-particles";

function particleCount(): number {
  return document.body.querySelectorAll(".rounded-full").length;
}

describe("precious resource gain particles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("plays gold sparks for 0.5s when the burst nonce rises", () => {
    const view = render(<ResourceCoinIcon resource="gold" burstNonce={0} />);
    expect(particleCount()).toBe(0);

    view.rerender(<ResourceCoinIcon resource="gold" burstNonce={1} />);
    const firstBurst = particleCount();
    expect(firstBurst).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(PRECIOUS_RESOURCE_GAIN_PARTICLE_MS);
    });
    const whileWindowOpen = particleCount();
    expect(whileWindowOpen).toBeGreaterThan(firstBurst);

    act(() => {
      vi.advanceTimersByTime(PRECIOUS_RESOURCE_GAIN_PARTICLE_MS);
    });
    expect(particleCount()).toBe(whileWindowOpen);
  });

  it("plays insight sparks once inside the 0.5s window", () => {
    const view = render(<ResourceInsightIcon burstNonce={0} />);
    view.rerender(<ResourceInsightIcon burstNonce={1} />);
    const firstBurst = particleCount();
    expect(firstBurst).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(PRECIOUS_RESOURCE_GAIN_PARTICLE_MS + 200);
    });
    expect(particleCount()).toBe(firstBurst);
  });

  it("does not spark when the nonce stays put", () => {
    const view = render(<ResourceCoinIcon resource="silver" burstNonce={1} />);
    const spawned = particleCount();
    view.rerender(<ResourceCoinIcon resource="silver" burstNonce={1} />);
    expect(particleCount()).toBe(spawned);
  });
});
