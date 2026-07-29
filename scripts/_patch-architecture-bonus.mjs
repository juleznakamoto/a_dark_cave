const fs = require("fs");
const p = "ARCHITECTURE.md";
let s = fs.readFileSync(p, "utf8");

const marker = "StatEffectsTooltip.tsx";
const i = s.indexOf(marker);
if (i < 0) throw new Error("StatEffectsTooltip missing");
const end = s.indexOf("), `StripePoweredBy", i);
if (end < 0) throw new Error("StripePoweredBy anchor missing");
const insert =
  ", `BonusCompositionTooltip.tsx` (per-source bonus breakdown for side-panel Bonuses rows)";
if (!s.slice(i, end).includes("BonusCompositionTooltip")) {
  s = s.slice(0, end) + insert + s.slice(end);
}

const effectsNeedle = "`effectsCalculation.ts`, `costCalculation.ts`";
const effectsInsert =
  "`effectsCalculation.ts`, `bonusComposition.ts` (side-panel bonus source breakdown), `costCalculation.ts`";
if (s.includes(effectsNeedle) && !s.includes("`bonusComposition.ts`")) {
  s = s.replace(effectsNeedle, effectsInsert);
}

fs.writeFileSync(p, s);
console.log("ARCHITECTURE.md updated");
