import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "..", "client/src/i18n/locales");

const restlessKnightMessages = {
  en: {
    firstTime:
      "A knight in worn armor arrives at the village. 'I have seen much of the world,' he says with a hollow voice. 'For some gold, I will share what I have seen in my travels.'",
    repeat:
      "Again, the knight in worn armor arrives at the village. 'I have seen much of the world,' he says with a hollow voice. 'For some gold, I will share what I have seen in my travels.'",
  },
  de: {
    firstTime:
      "Ein Ritter in abgetragener Rüstung erreicht das Dorf. ‚Ich habe viel von der Welt gesehen,‘ sagt er mit hohler Stimme. ‚Für etwas Gold teile ich, was ich auf meinen Reisen gesehen habe.‘",
    repeat:
      "Erneut erreicht der Ritter in abgetragener Rüstung das Dorf. ‚Ich habe viel von der Welt gesehen,‘ sagt er mit hohler Stimme. ‚Für etwas Gold teile ich, was ich auf meinen Reisen gesehen habe.‘",
  },
};

const woodcutterCost = {
  en: "{{foodCost}} food",
  de: "{{foodCost}} Nahrung",
};

for (const locale of ["en", "de", "es", "fr", "ru", "zh-CN"]) {
  const filePath = path.join(localesDir, locale, "events.json");
  const events = JSON.parse(fs.readFileSync(filePath, "utf8"));

  events.restlessKnight = events.restlessKnight ?? {};
  events.restlessKnight.message =
    restlessKnightMessages[locale] ?? restlessKnightMessages.en;

  if (events.woodcutter?.choices?.acceptServices) {
    events.woodcutter.choices.acceptServices.cost =
      woodcutterCost[locale] ?? woodcutterCost.en;
  }

  const sorted = Object.fromEntries(
    Object.entries(events).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(filePath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Updated ${locale}/events.json`);
}
