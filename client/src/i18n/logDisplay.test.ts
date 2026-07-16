import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { hasLogEntryText, resolveLogPanelMessage, resolveOutcomeLogMessage } from "./logDisplay";
import {
  getStartScreenNarrativeEnglishFallback,
  resolveInheritedActionLogMessage,
  START_NARRATIVE_LOG_KEY,
} from "./resolveGameText";
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

  it("re-localizes cruel-mode opening narrative in German (legacy English save)", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage({
      id: "initial-narrative",
      message: getStartScreenNarrativeEnglishFallback(true),
      timestamp: 0,
      type: "system",
    });
    expect(text).toBe(
      "Eine sehr dunkle Höhle. Die Luft ist eiskalt und feucht. Du erkennst kaum etwas um dich herum.",
    );
  });

  it("re-localizes opening narrative via logKey and logVars in German", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(getStartScreenNarrativeEnglishFallback(false), {
        id: "initial-narrative",
        logKey: START_NARRATIVE_LOG_KEY,
        logVars: { cruelMode: 0 },
      }),
    );
    expect(text).toBe(
      "Eine dunkle Höhle. Die Luft ist kalt und feucht. Du erkennst kaum die Umrisse um dich herum.",
    );
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
      "Die Schreiberhütte steht fertig. Gelehrte versammeln sich darin, um die Welt zu studieren und ihr Wissen zu schärfen.",
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
      "Die Gießerei erwacht zum Leben, um mithilfe von Feuer und Hitze Erze zu verschmelzen.",
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

  it("matches legacy English blast portal log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "The ember bombs detonate in a bright flash of fire and light. The ancient gate cracks and crumbles. Whatever could have been sealed within has been released. The city should get ready for whatever comes out of there.",
      ),
    );
    expect(text).toBe(
      "Die Glutbomben detonieren in einem hellen Feuerblitz. Das alte Tor bricht und bröckelt. Was auch immer darin eingeschlossen war, ist frei. Die Stadt sollte sich auf das vorbereiten, was hervorkommt.",
    );
  });

  it("matches legacy English forest cave success log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "As the villagers descend the cave, savage hounds erupt from darkness in relentless packs. Screams echo as claws tear and teeth snap. When the last creature falls, all villagers survive, but hollowed by what they\u2019ve endured.",
      ),
    );
    expect(text).toBe(
      "Als die Dorfbewohner in die Höhle hinabsteigen, brechen wilde Hunde in unerbittlichen Rudeln aus der Dunkelheit hervor. Schreie hallen wider, während Krallen reißen und Zähne schnappen. Als die letzte Kreatur fällt, überleben alle Dorfbewohner – aber erschüttert von dem, was sie erlebt haben.",
    );
  });

  it("matches legacy English forest cave failure log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "As the expedition enters the cave it is overwhelmed by a pack of brutal hounds. 3 villagers are torn apart by savage jaws before the survivors manage to retreat.",
      ),
    );
    expect(text).toBe(
      "Als die Expedition die Höhle betritt, wird sie von einem Rudel brutaler Hunde überwältigt. 3 Dorfbewohner werden von wütenden Kiefern zerrissen, bevor die Überlebenden sich zurückziehen können.",
    );
  });

  it("matches legacy English blackreach canyon success log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "You venture deep into Blackreach Canyon. There, perched on a stone pillar, sits a magnificent one-eyed crow. Using the harness, your carefully approach and bond with the creature. The One-eyed Crow has joined your fellowship.",
      ),
    );
    expect(text).toBe(
      "Du wagst dich tief in die Schwarzklamm vor. Dort, auf einer Steinsäule sitzend, thront eine prächtige einäugige Krähe. Mit dem Geschirr näherst du dich vorsichtig und schließt eine Bindung mit dem Wesen. Die Einäugige Krähe ist deiner Gemeinschaft beigetreten.",
    );
  });

  it("matches legacy English castle ruins major failure log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "Shortly after your expedition enters the cursed castle ruins dozens of undead creatures pour from hidden chambers. In the desperate battle that follows, 8 villagers are overwhelmed by the supernatural horde. The survivors flee in terror.",
      ),
    );
    expect(text).toBe(
      "Kurz nachdem eure Expedition die verfluchten Burgruinen betritt, strömen Dutzende Untote aus verborgenen Kammern. In der verzweifelten Schlacht, die folgt, werden 8 Dorfbewohner von der übernatürlichen Horde überwältigt. Die Überlebenden fliehen in Panik.",
    );
  });

  it("matches legacy English castle ruins minor failure log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "Your expedition is ambushed by grotesque undead experiments left behind by the necromancer. 3 villagers fall to the undead before the survivors manage to retreat.",
      ),
    );
    expect(text).toBe(
      "Eure Expedition wird von grotesken Untoten-Experimenten überfallen, die der Nekromant zurückgelassen hat. 3 Dorfbewohner fallen den Untoten zum Opfer, bevor es den Überlebenden gelingt, sich zurückzuziehen.",
    );
  });

  it("matches legacy English wizard necromancer castle event log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage({
      id: `wizardNecromancerCastle-${Date.now()}`,
      message:
        "The wizard calls you to his tower: 'I have learned of a castle deep in the wilderness, the former domain of a long-dead necromancer. Within its walls lie ancient scrolls that speak of how we can defeat what dwells in the depths of the cave.'",
      timestamp: 0,
      type: "event",
    });
    expect(text).toBe(
      "Der Zauberer ruft dich in seinen Turm: 'Ich habe von einer Burg tief in der Wildnis erfahren, dem einstigen Reich eines lange toten Nekromanten. In ihren Mauern liegen alte Schriftrollen, die davon sprechen, wie wir besiegen können, was in den Tiefen der Höhle haust.'",
    );
  });

  it("matches legacy English hill grave failure log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "Your expedition enters the hill grave but lacks the skill to navigate its deadly traps. 2 villagers fall to the king's final defenses before the survivors retreat in horror, leaving their companions' bodies in the cursed tomb.",
      ),
    );
    expect(text).toBe(
      "Eure Expedition betritt das Hügelgrab, verfügt aber nicht über das Geschick, seine tödlichen Fallen zu überwinden. 2 Dorfbewohner fallen den letzten Verteidigungen des Königs zum Opfer, bevor die Überlebenden voller Entsetzen fliehen und die Körper ihrer Gefährten im verfluchten Grab zurücklassen.",
    );
  });

  it("matches legacy English hill grave success log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "Your expedition carefully navigates the treacherous traps of the hill grave. Your villagers disarm the ancient mechanisms and reach the burial chamber. Among the king's treasures, you discover pure frostglass, cold as the void itself.",
      ),
    );
    expect(text).toBe(
      "Eure Expedition navigiert geschickt durch die tückischen Fallen des Hügelgrabs. Eure Dorfbewohner entschärfen die alten Mechanismen und erreichen die Grabkammer. Unter den Schätzen des Königs entdeckt ihr reines Frostglas, kalt wie die Leere selbst.",
    );
  });

  it("re-localizes hill grave success in reward dialog (German UI)", async () => {
    await i18n.changeLanguage("de");
    const text = resolveOutcomeLogMessage(
      "Your expedition carefully navigates the treacherous traps of the hill grave. Your villagers disarm the ancient mechanisms and reach the burial chamber. Among the king's treasures, you discover pure frostglass, cold as the void itself.",
    );
    expect(text).toBe(
      "Eure Expedition navigiert geschickt durch die tückischen Fallen des Hügelgrabs. Eure Dorfbewohner entschärfen die alten Mechanismen und erreichen die Grabkammer. Unter den Schätzen des Königs entdeckt ihr reines Frostglas, kalt wie die Leere selbst.",
    );
  });

  it("matches legacy English castle ruins success log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "The expedition to the dead necromancer's castle ruins proves successful! Deep within the you find the ancient scrolls wrapped in dark silk, revealing cryptic knowledge about how to defeat what was locked deep in the cave.",
      ),
    );
    expect(text).toBe(
      "Die Expedition zu den Burgruinen des toten Nekromanten ist erfolgreich! Tief im Inneren findet ihr die in dunkle Seide gewickelten alten Schriftrollen, die kryptisches Wissen darüber offenbaren, wie man besiegen kann, was tief in der Höhle eingesperrt wurde.",
    );
  });

  it("matches legacy English collapsed tower success log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "Inside the tower you find a necromancer and his followers, surrounded by vials of liquids and crude syringes. He was harvesting the villagers' blood for dark experiments. Your men put an end to his vile work and take a vial of his blood. Among his tools, you find his powerful bone saw.",
      ),
    );
    expect(text).toBe(
      "Im Turm findet ihr einen Nekromanten und seine Anhänger, umgeben von Fläschchen mit Flüssigkeiten und groben Spritzen. Er sammelte das Blut der Dorfbewohner für finstere Experimente. Eure Männer setzen seinem abscheulichen Werk ein Ende und nehmen eine Phiole seines Blutes. Unter seinen Werkzeugen findet ihr seine mächtige Knochensäge.",
    );
  });

  it("matches legacy English collapsed tower failure log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "Your expedition reaches the Collapsed Tower, but you are attacked by hooded figures outside. A tall man in a dark robe stands among them, commanding an aura of menace. 4 villagers fall before the rest flee to safety.",
      ),
    );
    expect(text).toBe(
      "Eure Expedition erreicht den eingestürzten Turm, doch draußen werdet ihr von vermummten Gestalten angegriffen. Ein großer Mann in dunkler Robe steht unter ihnen und strahlt Bedrohung aus. 4 Dorfbewohner fallen, bevor die anderen in Sicherheit fliehen.",
    );
  });

  it("re-localizes collapsed tower success in reward dialog (German UI)", async () => {
    await i18n.changeLanguage("de");
    const text = resolveOutcomeLogMessage(
      "Inside the tower you find a necromancer and his followers, surrounded by vials of liquids and crude syringes. He was harvesting the villagers' blood for dark experiments. Your men put an end to his vile work and take a vial of his blood. Among his tools, you find his powerful bone saw.",
    );
    expect(text).toBe(
      "Im Turm findet ihr einen Nekromanten und seine Anhänger, umgeben von Fläschchen mit Flüssigkeiten und groben Spritzen. Er sammelte das Blut der Dorfbewohner für finstere Experimente. Eure Männer setzen seinem abscheulichen Werk ein Ende und nehmen eine Phiole seines Blutes. Unter seinen Werkzeugen findet ihr seine mächtige Knochensäge.",
    );
  });

  it("matches legacy English bandit lair success log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "Your party tracks the bandit to a ramshackle lair. You overwhelm him, recover the trader's dagger, and find 250 silver stashed among his plunder.",
      ),
    );
    expect(text).toBe(
      "Eure Gruppe verfolgt den Banditen zu einem wackeligen Unterschlupf. Ihr überwältigt ihn, bergt den Dolch des Händlers und findet 250 Silber unter seiner Beute.",
    );
  });

  it("matches legacy English bandit lair failure log in German saves", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "Your villagers search the hills but cannot corner the bandit. The trail goes cold, and the dagger is still in his hands.",
      ),
    );
    expect(text).toBe(
      "Eure Dorfbewohner durchsuchen die Hügel, können den Banditen aber nicht stellen. Die Spur verliert sich, und der Dolch ist noch immer in seinen Händen.",
    );
  });

  it("re-localizes reward dialog narrative via resolveOutcomeLogMessage", async () => {
    await i18n.changeLanguage("de");
    const text = resolveOutcomeLogMessage(
      "Your party tracks the bandit to a ramshackle lair. You overwhelm him, recover the trader's dagger, and find 250 silver stashed among his plunder.",
    );
    expect(text).toBe(
      "Eure Gruppe verfolgt den Banditen zu einem wackeligen Unterschlupf. Ihr überwältigt ihn, bergt den Dolch des Händlers und findet 250 Silber unter seiner Beute.",
    );
  });

  it("re-localizes castle ruins success in reward dialog (German UI)", async () => {
    await i18n.changeLanguage("de");
    const text = resolveOutcomeLogMessage(
      "The expedition to the dead necromancer's castle ruins proves successful! Deep within the you find the ancient scrolls wrapped in dark silk, revealing cryptic knowledge about how to defeat what was locked deep in the cave.",
    );
    expect(text).toBe(
      "Die Expedition zu den Burgruinen des toten Nekromanten ist erfolgreich! Tief im Inneren findet ihr die in dunkle Seide gewickelten alten Schriftrollen, die kryptisches Wissen darüber offenbaren, wie man besiegen kann, was tief in der Höhle eingesperrt wurde.",
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
      "Unter den Trümmern findest du eine verwitterte Schriftrolle mit Weisheiten, um in dieser unbarmherzigen Welt zu überleben.",
    );
  });

  it("re-localizes achievement claim logs via logKey in English UI", async () => {
    await i18n.changeLanguage("en");
    const text = resolveLogPanelMessage({
      id: "achievement-basic-0-hunter-123",
      message: "Hunter Achievement complete: +500 Wood",
      logKey: "achievements.completeLog",
      logVars: {
        achievementId: "basic-0-hunter",
        fallbackName: "Hunter",
        reward_wood: 500,
      },
      timestamp: 0,
      type: "event",
    });
    expect(text).toBe("Hunter Achievement complete: +500 Wood");
  });

  it("re-localizes gambler practice logs via logKey in German UI", async () => {
    await i18n.changeLanguage("de");
    const text = resolveLogPanelMessage(
      systemEntry(
        "You won the practice round (no gold at stake). 2 of 3 practice games remaining.",
        {
          id: "gambler-practice-round-123",
          logKey: "gambler.practiceWinRemaining",
          logVars: { remaining: 2, total: 3 },
        },
      ),
    );
    expect(text).toBe(
      "Du hast die Übungsrunde gewonnen (kein Gold im Einsatz). Noch 2 von 3 Übungsspielen.",
    );
  });
});
