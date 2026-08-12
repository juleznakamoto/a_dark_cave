const fs = require("fs");
const path = "ARCHITECTURE.md";
let s = fs.readFileSync(path, "utf8");
const old =
  "gameFeedbackForm.ts` (hosted Google Form URL; StartScreen-safe `openGameFeedbackForm` has no static store import; `openFeedbackDialog` dynamic-imports `@/game/state`);";
const neu =
  "gameFeedbackForm.ts` (hosted Google Form URL; StartScreen-safe, no store import) + `openFeedbackDialog.ts` (sync store write; game-path only);";
if (!s.includes(old)) {
  const i = s.indexOf("gameFeedbackForm.ts");
  console.error("OLD NOT FOUND", JSON.stringify(s.slice(i, i + 240)));
  process.exit(1);
}
fs.writeFileSync(path, s.replace(old, neu));
console.log("ok");
