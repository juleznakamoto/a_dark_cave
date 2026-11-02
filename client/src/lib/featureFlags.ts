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
 * On for non-Steam versions. The Steam desktop build stays off
 * (`arePactsEnabled` in the pact rules). Picks already stored on a save
 * stay there and start working where pacts are on.
 */
export const PACTS_ENABLED = true;
