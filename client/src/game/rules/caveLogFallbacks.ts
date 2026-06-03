/** English fallbacks for cave action log keys (no game-rules imports — safe for i18n/logDisplay). */

export const CAVE_FIRST_VISIT_LOG_FALLBACKS: Record<
  string,
  Record<string, string>
> = {
  lightFire: {
    firstVisit:
      "The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.",
    firstVisitBoost:
      "The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting. Someone left you a gift.",
  },
  chopWood: {
    firstVisit:
      "Some wood lies scattered near the cave's entrance. It might prove useful.",
  },
  exploreCave: {
    firstVisit:
      "The torchlight illuminates the cave walls. In the flickering light, you notice a path leading deeper into the caves.",
  },
  ventureDeeper: {
    firstVisit:
      "The air grows colder as you descend the path deeper into the cave. The walls around you seem unnaturally smooth, as if shaped by someone.",
  },
  descendFurther: {
    firstVisit:
      "With the lantern casting a steady glow, you descend even deeper. Suddenly your feet touch manmade stone steps, worn by time.",
  },
  exploreRuins: {
    firstVisit:
      "At the end of the stairs, a vast cavern opens before you. In the dark lie the ruins of a lost city, the remains of a civilization long gone.",
  },
  exploreTemple: {
    firstVisit:
      "As you delve deeper into the ruins of the underground city, a grand temple emerges from the cavern floor, mostly intact, its shadow stretching over the forgotten remnants of the city.",
  },
  exploreCitadel: {
    firstVisit:
      "At the deepest part of the city, a massive citadel rises before you. Its size suggests it houses something of great power, or something of great danger.",
  },
};

export const CAVE_EXPLORE_LOG_FALLBACKS: Record<string, string> = {
  blastPortal:
    "The ember bombs detonate in a bright flash of fire and light. The ancient gate cracks and crumbles. Whatever could have been sealed within has been released. The city should get ready for whatever comes out of there.",
  lowChamber:
    "Using the reinforced rope, you descend into the low chamber. Amongst the treasures you find a mastermason's chisel, a tool of legendary craftsmanship.",
  occultistChamber:
    "Following the occultist's map, you find the chamber containing his treasures. Amongst them is his grimoire, filled with forbidden knowledge and arcane secrets.",
  exploreUndergroundLake:
    "Using the skull lantern's grim glow, you descend to the underground lake and build a small boat. On a tiny island in the middle of the dark lake, forgotten treasures lie in shadow, untouched for ages.",
  lureLakeCreature:
    "You set a massive trap at the edge of the underground lake, baited with piles of meat. Hours pass before the black waters erupt, and a titanic, tentacled horror rises from the depths and crawls into the trap.",
  hiddenLibrary:
    "The monastery's map leads you deep into the cave to the hidden library where you find a codex.",
};

export const CAVE_LOOT_LOG_FALLBACKS: Record<string, Record<string, string>> = {
  exploreCave: {
    debrisScroll:
      "Among the debris you uncover a timeworn scroll containing wisdom for enduring this unforgiving world.",
    torchBag: "You find an old, dusty bag with 25 Torches in the cave.",
  },
  ventureDeeper: {
    tarnishedAmulet:
      "In the cave's shadows, something glints. You find a Tarnished Amulet.",
    silverSack: "You find a small leather sack containing 50 Silver.",
    mapFragment: "On the cave floor you find a tattered fragment of a map.",
  },
};
