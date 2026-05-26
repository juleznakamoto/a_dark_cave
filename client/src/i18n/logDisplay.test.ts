import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { hasLogEntryText, resolveLogPanelMessage } from "./logDisplay";
import { resolveInheritedActionLogMessage } from "./resolveGameText";
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

  it("matches legacy English dark estate build log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "The Dark Estate stands has been built on a small hill near the village, offering solitude and refuge.",
      ),
    );
    expect(text).toBe(
      "Das Dunkle Anwesen steht auf einem kleinen Hügel nahe dem Dorf und bietet Einsamkeit und Zuflucht.",
    );
  });

  it("translates dark estate build log via logKey in German", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "The Dark Estate stands has been built on a small hill near the village, offering solitude and refuge.",
        { logKey: "building.darkEstate" },
      ),
    );
    expect(text).toBe(
      "Das Dunkle Anwesen steht auf einem kleinen Hügel nahe dem Dorf und bietet Einsamkeit und Zuflucht.",
    );
  });

  it("matches legacy English clerk hut build log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "A clerks hut is erected, its occupant ready to track the flow of resources with meticulous care.",
      ),
    );
    expect(text).toBe(
      "Eine Schreibstube wird errichtet, ihr Bewohner bereit, den Ressourcenfluss sorgfältig zu verfolgen.",
    );
  });

  it("translates foundry build log via logKey in German", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "The foundry roars to life as fire and heat fuse raw materials.",
        { logKey: "building.foundry" },
      ),
    );
    expect(text).toBe(
      "Die Gießerei erwacht zum Leben, während Feuer und Hitze Rohmaterialien verschmelzen.",
    );
  });

  it("matches legacy English village begins milestone in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "A small village begins to take shape. Villagers need food and wood to survive.",
      ),
    );
    expect(text).toBe(
      "Ein kleines Dorf nimmt Gestalt an. Die Dorfbewohner brauchen Nahrung und Holz zum Überleben.",
    );
  });

  it("translates gambler loss log via logKey in German", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry("You lost 10 gold to the obsessed gambler.", {
        logKey: "gambler.lose",
        logVars: { amount: 10 },
      }),
    );
    expect(text).toBe(
      "Du hast 10 Gold an den besessenen Spieler verloren.",
    );
  });

  it("matches legacy English gambler loss logs in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry("You lost 10 gold to the obsessed gambler."),
    );
    expect(text).toBe(
      "Du hast 10 Gold an den besessenen Spieler verloren.",
    );
  });

  it("translates button upgrade logs via logKey in German", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry("Your mastery of Cave Exploring deepens.", {
        logKey: "buttonUpgrade.deepens",
        logVars: { skillKey: "caveExplore" },
      }),
    );
    expect(text).toBe("Deine Meisterschaft in Höhlenforschung vertieft sich.");
  });

  it("matches legacy English button upgrade logs in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry("Your mastery of Cave Exploring deepens."),
    );
    expect(text).toBe("Deine Meisterschaft in Höhlenforschung vertieft sich.");
  });

  it("translates signup welcome gold log via logKey in German", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "You received 200 Gold as a welcome bonus for creating an account!",
        {
          logKey: "auth.signupWelcomeLog",
          logVars: { amount: 200 },
        },
      ),
    );
    expect(text).toBe(
      "Du hast 200 Gold als Willkommensbonus für die Kontoerstellung erhalten!",
    );
  });

  it("matches legacy English signup welcome gold logs in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "You received 200 Gold as a welcome bonus for creating an account!",
      ),
    );
    expect(text).toBe(
      "Du hast 200 Gold als Willkommensbonus für die Kontoerstellung erhalten!",
    );
  });

  it("returns stored message when no catalog match exists", () => {
    const message = "Some unknown custom log line.";
    expect(resolveLogPanelMessage(systemEntry(message))).toBe(message);
  });

  it("hasLogEntryText rejects blank messages without logKey", () => {
    expect(hasLogEntryText(systemEntry("   "))).toBe(false);
    expect(hasLogEntryText(systemEntry("Hello"))).toBe(true);
    expect(
      hasLogEntryText(systemEntry("", { logKey: "freezingDeath.one" })),
    ).toBe(true);
  });

  it("resolves inherited cave loot log keys from earlier action catalogs", async () => {
    await i18n.changeLanguage("de");
    const text = resolveInheritedActionLogMessage(
      "ventureDeeper",
      "debrisScroll",
      {
        exploreCave: {
          debrisScroll:
            "Among the debris you uncover a timeworn scroll containing wisdom for enduring this unforgiving world.",
        },
      },
    );
    expect(text).toBe(
      "Unter den Trümmern findest du eine verwitterte Schriftrolle mit Weisheit, um in dieser unbarmherzigen Welt zu überleben.",
    );
  });
});
