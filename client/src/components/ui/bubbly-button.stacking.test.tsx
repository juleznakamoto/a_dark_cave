/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import {
  InlineButtonParticleLayer,
  useInlineButtonParticles,
} from "@/components/ui/bubbly-button";
import { CRAFT_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";

/**
 * Mirrors the exact stacking structure CooldownButton renders:
 * an `isolation: isolate` wrapper containing the particle layer (z:-1)
 * followed by the button (z:10). This is the same pattern BubblyButton
 * uses in production, and per CSS spec is unambiguous regardless of any
 * ancestor DOM/CSS — isolate cuts off all outside interference.
 */
function IsolatedButtonReplica() {
  const { bursts, triggerParticles } = useInlineButtonParticles(
    CRAFT_PARTICLE_CONFIG,
  );

  return (
    <div className="relative inline-block" style={{ isolation: "isolate" }}>
      <InlineButtonParticleLayer bursts={bursts} />
      <button
        type="button"
        data-testid="the-button"
        style={{ position: "relative", zIndex: 10 }}
        onClick={triggerParticles}
      >
        Click
      </button>
    </div>
  );
}

describe("Inline click particles vs. button stacking", () => {
  it("places the particle layer before the button in DOM order with z:-1 vs z:10", async () => {
    const { container } = render(<IsolatedButtonReplica />);

    await act(async () => {
      screen.getByTestId("the-button").click();
    });

    const isolateWrapper = container.firstElementChild as HTMLElement;
    expect(isolateWrapper.style.isolation).toBe("isolate");

    const particleLayer = isolateWrapper.querySelector(
      ":scope > div.absolute.inset-0",
    ) as HTMLElement | null;
    const button = screen.getByTestId("the-button");

    expect(particleLayer).not.toBeNull();
    expect(particleLayer!.style.zIndex).toBe("-1");
    expect(button.style.zIndex).toBe("10");

    // DOM order: particle layer must precede the button so it paints first
    // (lower z-index) within this single isolated stacking context.
    expect(particleLayer!.compareDocumentPosition(button)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    const particles = isolateWrapper.querySelectorAll(".rounded-full");
    expect(particles.length).toBeGreaterThan(0);
    for (const particle of Array.from(particles)) {
      expect((particle as HTMLElement).style.zIndex).toBe("-1");
    }
  });

  it("renders nothing when there are no active bursts", () => {
    const { container } = render(<InlineButtonParticleLayer bursts={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
