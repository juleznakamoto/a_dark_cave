import { audioManager, SOUND_VOLUME, caveExploreVolume } from "@/lib/audio";

const CAVE_EXPLORE_SOUND_ACTIONS = new Set([
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
  "exploreCitadel",
  "lowChamber",
  "occultistChamber",
  "hiddenLibrary",
  "exploreUndergroundLake",
  "blastPortal",
  "encounterBeyondPortal",
]);

/** One-shot action cues that should fire when the player clicks, not when the bar finishes. */
export function playActionStartSfx(
  actionId: string,
  opts: { forestUnlocked: boolean; caveExploreLevel: number },
): void {
  if (actionId.startsWith("craft")) {
    audioManager.playSound("craft", SOUND_VOLUME.craft);
    return;
  }
  if (actionId.startsWith("mine")) {
    audioManager.playSound("mining", SOUND_VOLUME.mining);
    return;
  }
  // chopWood is Gather Wood in the cave, Chop Wood once the forest is unlocked
  if (actionId === "chopWood") {
    if (opts.forestUnlocked) {
      audioManager.playSound("chopWood", SOUND_VOLUME.chopWood);
    } else {
      audioManager.playSound("gatherWood", SOUND_VOLUME.gatherWood);
    }
    return;
  }
  if (actionId === "hunt") {
    audioManager.playSound("hunt", SOUND_VOLUME.hunt);
    return;
  }
  if (CAVE_EXPLORE_SOUND_ACTIONS.has(actionId)) {
    audioManager.playSound(
      "caveExplore",
      caveExploreVolume(opts.caveExploreLevel),
    );
  }
}
