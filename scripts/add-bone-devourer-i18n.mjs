import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "..", "client/src/i18n/locales");

const boneDevourerEn = {
  title: "The Bone Devourer",
  message: {
    firstTime:
      "A deformed creature shuffles to the gates, its hunched form covered in pale, stretched skin. It speaks in a rasping voice: 'I seek bones. I pay {{silverReward}} Silver.'",
    repeat:
      "The creature returns to the gates, its hunched form still covered in pale, stretched skin. It speaks in its familiar rasping voice: 'I seek bones. I pay {{silverReward}} Silver.'",
  },
  choices: {
    sellBones: {
      label: "Sell {{boneCost}} Bones",
      cost: "{{boneCost}} bones",
    },
    refuse: {
      label: "Refuse trade",
    },
  },
  log: {
    outcome0: "You don't have enough bones for the trade.",
    outcome1:
      "The creature takes the bones with its gnarled hands, as if attempting to count them. It places a pouch of silver at your feet and disappears into the darkness.",
    outcome2:
      "You refuse the creature's offer. It hisses in displeasure and retreats into the shadows. You sense it will return.",
    outcome3:
      "Your indecision frustrates the creature. It hisses in displeasure and retreats into the shadows.",
  },
};

const boneDevourerDe = {
  title: "Der Knochenverschlinger",
  message: {
    firstTime:
      "Eine deformierte Kreatur schlurft zum Tor, ihre gebeugte Gestalt von blasser, gespannter Haut bedeckt. In kratziger Stimme spricht sie: ‚Ich suche Knochen. Ich zahle {{silverReward}} Silber.‘",
    repeat:
      "Die Kreatur kehrt zum Tor zurück, ihre gebeugte Gestalt noch immer von blasser, gespannter Haut bedeckt. In vertraut kratziger Stimme spricht sie: ‚Ich suche Knochen. Ich zahle {{silverReward}} Silber.‘",
  },
  choices: {
    sellBones: {
      label: "{{boneCost}} Knochen verkaufen",
      cost: "{{boneCost}} Knochen",
    },
    refuse: {
      label: "Handel ablehnen",
    },
  },
  log: {
    outcome0: "Du hast nicht genug Knochen für den Handel.",
    outcome1:
      "Die Kreatur nimmt die Knochen mit knorrigen Händen, als wolle sie sie zählen. Sie legt einen Beutel Silber zu deinen Füßen und verschwindet in der Dunkelheit.",
    outcome2:
      "Du lehnst das Angebot der Kreatur ab. Sie zischt missbilligend und zieht sich in die Schatten zurück. Du spürst, dass sie zurückkehren wird.",
    outcome3:
      "Deine Unentschlossenheit verärgert die Kreatur. Sie zischt missbilligend und zieht sich in die Schatten zurück.",
  },
};

/** Idempotent: ensures boneDevourer exists in all locale event catalogs. */
const translations = {
  en: boneDevourerEn,
  de: boneDevourerDe,
  es: boneDevourerEn,
  fr: boneDevourerEn,
  ru: boneDevourerEn,
  "zh-CN": boneDevourerEn,
};

for (const [locale, catalog] of Object.entries(translations)) {
  const filePath = path.join(localesDir, locale, "events.json");
  const events = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (events.boneDevourer) {
    continue;
  }
  events.boneDevourer = catalog;
  const sorted = Object.fromEntries(
    Object.entries(events).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(filePath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Updated ${locale}/events.json`);
}
