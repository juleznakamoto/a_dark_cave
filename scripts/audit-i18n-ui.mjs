/**
 * Fail if known player-facing UI components contain hardcoded English
 * strings that should use i18n. Run: node scripts/audit-i18n-ui.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COMPONENTS = path.join(ROOT, "client/src/components/game");

/** File -> patterns that must NOT appear (user-facing English leaks). */
const FORBIDDEN = {
  "panels/EstatePanel.tsx": [
    /\bRest\b.*font-medium/,
    />\s*Sleep\s*</,
    />\s*Focus\s*</,
    /Cube Whispers/,
  ],
  "panels/VillagePanel.tsx": [
    />\s*Produce\s*</,
    /Merchant cannot be called/,
    /Next cycle in \{/,
  ],
  "panels/BastionPanel.tsx": [ />\s*Heal\s*</, />\s*Repair\s*</ ],
  "panels/AttackWavesChart.tsx": [
    /Attack Waves/,
    /It is calm, for now/,
    />\s*Provoke\s*</,
  ],
  "PlaylightWelcomeDialog.tsx": [/Welcome, Playlight player/],
  "PlaylightDiscoveryButton.tsx": [/More Games/],
  "ButtonPriorBadge.tsx": [/Click to assign Disgraced Prior/],
  "panels/ForestPanel.tsx": [
    />\s*Sacrifice\s*</,
    />\s*Buy\s*</,
    />\s*Sell\s*</,
  ],
};

let failed = false;

for (const [rel, patterns] of Object.entries(FORBIDDEN)) {
  const file = path.join(COMPONENTS, rel);
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      console.error(`FAIL ${rel}: matched ${pattern}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error("\nUI i18n audit FAILED");
  process.exit(1);
}

console.log("UI i18n audit PASSED (spot-check patterns)");
