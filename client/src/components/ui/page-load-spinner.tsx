import { useEffect, useRef, useState } from "react";
import { useCoinHoverParticles } from "@/components/ui/coin-hover-particles";
import { FIRE_LOAD_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";

const SPINNER_DELAY_MS = 500;
const BOOT_SPINNER_ID = "adc-boot-spinner";

/** Survives Suspense → route swaps so the spinner does not re-delay mid-load. */
let sharedSpinnerVisible = false;
let mountedSpinnerCount = 0;

declare global {
  interface Window {
    __ADC_BOOT_SPINNER_TIMER?: ReturnType<typeof setTimeout>;
  }
}

/** Clear the HTML boot spinner / its 500ms reveal timer (safe to call repeatedly). */
export function dismissBootSpinner(): void {
  if (typeof window === "undefined") return;
  if (window.__ADC_BOOT_SPINNER_TIMER !== undefined) {
    clearTimeout(window.__ADC_BOOT_SPINNER_TIMER);
    window.__ADC_BOOT_SPINNER_TIMER = undefined;
  }
  document.getElementById(BOOT_SPINNER_ID)?.remove();
}

function takeOverBootSpinner(): boolean {
  if (typeof window === "undefined") return false;
  const boot = document.getElementById(BOOT_SPINNER_ID);
  const wasVisible = boot?.dataset.visible === "1";
  dismissBootSpinner();
  return Boolean(wasVisible);
}

/**
 * Full-viewport black loading screen with a fire-colored spinner.
 * Spinner (and particles) appear only after 500ms to avoid a flash on fast loads.
 * Decorative only — does not replace SEO fallback content in index.html.
 */
export default function PageLoadSpinner() {
  const [showSpinner, setShowSpinner] = useState(() => {
    if (takeOverBootSpinner()) {
      sharedSpinnerVisible = true;
    }
    return sharedSpinnerVisible;
  });
  const originRef = useRef<HTMLSpanElement | null>(null);

  const { setForcedEmit, portal } = useCoinHoverParticles("gold", {
    particleOriginRef: originRef,
    particleConfig: FIRE_LOAD_PARTICLE_CONFIG,
    enabled: showSpinner,
    // Below the spinner layer (z=2) so embers emerge from under the rim.
    zIndex: 1,
  });

  useEffect(() => {
    mountedSpinnerCount += 1;
    return () => {
      mountedSpinnerCount -= 1;
      if (mountedSpinnerCount <= 0) {
        mountedSpinnerCount = 0;
        sharedSpinnerVisible = false;
      }
    };
  }, []);

  useEffect(() => {
    if (showSpinner) {
      sharedSpinnerVisible = true;
      return;
    }
    const timer = setTimeout(() => {
      sharedSpinnerVisible = true;
      setShowSpinner(true);
    }, SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [showSpinner]);

  useEffect(() => {
    setForcedEmit(showSpinner);
    return () => setForcedEmit(false);
  }, [showSpinner, setForcedEmit]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black"
        style={{ zIndex: 0 }}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading"
      />
      {portal}
      {showSpinner ? (
        <div
          className="pointer-events-none fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 2 }}
          aria-hidden="true"
        >
          <span ref={originRef} className="adc-page-load-spinner">
            <span className="adc-page-load-spinner__ring">
              <span className="adc-page-load-spinner__core" />
            </span>
          </span>
        </div>
      ) : null}
    </>
  );
}
