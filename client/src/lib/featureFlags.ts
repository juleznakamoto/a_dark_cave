/**
 * Compile-time feature switches. Flip a flag here when a gated feature is
 * ready to ship; do not sprinkle ad-hoc env checks at call sites.
 */

/**
 * Steam: finishing a normal-mode run unlocks Cruel Mode (end-screen CTA +
 * new-game checkbox). Off until we ship that flow.
 */
export const STEAM_CRUEL_MODE_UNLOCK = false;
