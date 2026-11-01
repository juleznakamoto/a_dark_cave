/**
 * Compile-time feature switches. Flip a flag here when a gated feature is
 * ready to ship; do not sprinkle ad-hoc env checks at call sites.
 */

/**
 * Steam: finishing a normal-mode run unlocks Cruel Mode (end-screen CTA +
 * new-game checkbox). Off until we ship that flow.
 */
export const STEAM_CRUEL_MODE_UNLOCK = false;

/**
 * Opening pact offer, pact boons, pact madness, and pact UI.
 * Off until the pact set is ready to ship. Picks already stored on a save
 * stay there and start working when this is turned on.
 */
export const PACTS_ENABLED = false;
