/**
 * Compile-time feature switches. Flip a flag here when a gated feature is
 * ready to ship; do not sprinkle ad-hoc env checks at call sites.
 */

/**
 * Steam full game: finishing a normal-mode run unlocks Cruel Mode
 * (end-screen CTA + new-game checkbox). The Steam demo stays off.
 */
export const STEAM_CRUEL_MODE_UNLOCK = true;

/**
 * Opening pact offer, pact boons, pact madness, and pact UI.
 * On for web, portals, and the full Steam game. The Steam demo stays off
 * (`arePactsEnabled` in the pact rules). Picks already stored on a save
 * stay there and start working where pacts are on.
 */
export const PACTS_ENABLED = true;
