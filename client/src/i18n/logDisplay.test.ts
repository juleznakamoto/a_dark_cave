import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { resolveLogPanelMessage } from "./logDisplay";
import type { LogEntry } from "@/game/rules/events";

function systemEntry(
  message: string,
  extra?: Partial<LogEntry>,
): LogEntry {
  return {
    id: "test",
    message,
    timestamp: 0,
    type: "system",
    ...extra,
  };
}

describe("resolveLogPanelMessage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("translates system logs via logKey in German", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry("One villager freezes to death in the cold.", {
        logKey: "freezingDeath.one",
      }),
    );
    expect(text).toBe("Ein Dorfbewohner erfriert in der Kälte.");
  });

  it("matches legacy English investment logs in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "100 Gold investment complete: Success. You gained 109 Gold.",
      ),
    );
    expect(text).toBe(
      "100 Gold-Investition abgeschlossen: Erfolg. Du hast 109 Gold erhalten.",
    );
  });

  it("matches legacy English madness logs in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "4 villagers succumb to madness and take their own lives.",
      ),
    );
    expect(text).toBe(
      "4 Dorfbewohner erliegen dem Wahnsinn und nehmen sich das Leben.",
    );
  });

  it("matches legacy English newcomer logs in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry("A newcomer arrives and makes themselves at home."),
    );
    expect(text).toBe("Ein Neuankömmling trifft ein und richtet sich ein.");
  });

  it("returns stored message when no catalog match exists", () => {
    const message = "Some unknown custom log line.";
    expect(resolveLogPanelMessage(systemEntry(message))).toBe(message);
  });
});
