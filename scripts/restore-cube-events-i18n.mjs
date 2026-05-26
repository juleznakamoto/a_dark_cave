/**
 * Restore cube event title/message in locale catalogs (lost during i18n migration).
 * Usage: node scripts/restore-cube-events-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** From client/src/game/rules/eventsCube.ts @ 2f6bd9be */
const cubeTextEn = {
  cubeDiscovery: {
    title: "The Whispering Cube",
    message:
      "Near the cave's entrance, you discover a perfectly polished metal cube. At first it seems still, but then you feel a faint vibration like a slow, rhythmic pulse, almost like a heartbeat.",
  },
  cube01: {
    title: "The Cube Awakens",
    message:
      "You wake in the night. The cube hums softly. Suddenly a gentle, melodic voice emerges from it: 'Long ago, a great civilization thrived upon this world, but it crumbled, its knowledge lost to the ages.'",
  },
  cube02: {
    title: "The Warrior Tribe",
    message:
      "'In the distant past, a tribe of fierce warriors was chosen to live deep in the caves. Their purpose was to guard something of great importance.'",
  },
  cube03: {
    title: "The Underground City",
    message:
      "'The warrior tribe grew into a vast underground city, safe from the world above, still protecting what they were sent to protect lifetimes ago.'",
  },
  cube04: {
    title: "The Sacred Oath",
    message:
      "'Though memory of what they protected has faded into legend, their vigilance endured. For generations the warriors have kept their sacred oath, watching over what lies at the city's deepest point.'",
  },
  cube05: {
    title: "The Sealed Gate",
    message:
      "'Long after the inhabitants of the underground city perished, the object of their devotion remained: a colossal, impenetrable gate, crafted with long-forgotten technology, hidden deep within the city's lowest chambers'",
  },
  cube06: {
    title: "The Gate Opens",
    message:
      "As the gate is shatters, the cube trembles in your hands, growing warm. A soft, but urgent whisper escapes it: 'I have gained new insights.'",
  },
  cube07: {
    title: "Ancient Technology",
    message:
      "'The ancient civilization that forged the gate possessed knowledge and technology far beyond the current age. They even crafted devices designed to be implanted within their skulls, enhancing both mind and body'",
  },
  cube08: {
    title: "The Resistance",
    message:
      "'The leaders ruled that every citizen must bear a device in their head. A small faction began to voice their concerns, forming a resistance as they recognized the dangers hidden within the technology.'",
  },
  cube09: {
    title: "The Golden Age",
    message:
      "'With the aid of the devices, the civilization thrived. An era of unprecedented peace and progress began, their knowledge and skill reaching heights that would never be seen again.'",
  },
  cube10: {
    title: "The Great Collapse",
    message:
      "'Knowledge flowed instantly, and society thrived. Behind the progress, the skull devices orchestrated humanity's thoughts, connecting minds in a quiet, inescapable web.''",
  },
  cube11: {
    title: "The Hive Mind",
    message:
      "'One day, without warning, an unimaginable magneto-electric pulse swept across the globe. Every device of the civilization, including those embedded within the skulls, was obliterated.'",
  },
  cube12: {
    title: "End of Civilization",
    message:
      "'The few survivors could not survive without the devices. Most died. Civilization regressed. Knowledge slipped into oblivion. Nature reclaimed the lands, leaving only buried ruins where greatness once stood.'",
  },
  cube13: {
    title: "Recovered Data",
    message:
      "The cube pulses with energy as you approach the slain creatures. It seems to extract information from somewhere. The cube grows warm, processing the recovered knowledge.",
  },
  cube14a: {
    title: "The Resistance",
    message:
      "'When the resistance opposed the skull devices, they were exiled into the mountain's depths, sealed away behind the gate. With no path back, they dug ever deeper. In isolation and darkness, their minds eroded and they descended into madness and degeneration.'",
  },
  cube14b: {
    title: "The Unknown Ore",
    message:
      "'One day, deep in the earth, they found a monolith of unknown ore. From it they forged an explosive to destroy the gate. But the bomb failed to breach the gate, instead unleashed an electro-magnetic pulse spanning the whole planet destroying all devices, ending civilization.'",
  },
  cube14c: {
    title: "The Unknown Ore",
    message:
      "'Shortly after the explosion, a man standing nearby began to dematerialize, his form flickering, half-transparent for seconds. Terrified and driven mad by what had happened, he took his own life moments later.'",
  },
  cube14d: {
    title: "Through the Gate",
    message:
      "'Desperate, the survivors theorized the ore could help them pass through the gate. With its last fragments, they built a smaller bomb and positioned their sanest man with it before the gate. Right after the blast, he turned ghostly, translucent, and then vanished through the gate.'",
  },
  cube15a: {
    title: "Recognition",
    message:
      "That was when you recognize that the creatures did not attack as they recognized you as one of their own. You are the man who vanished through the gate.",
  },
  cube15b: {
    title: "Recognition",
    message:
      "After finishing their story one of the survivors steps forward, pointing at you: 'You are the man who vanished through the gate. You are one of us.",
  },
};

const cubeTextDe = {
  cubeDiscovery: {
    title: "Der flüsternde Würfel",
    message:
      "Nahe dem Höhleneingang entdeckst du einen perfekt polierten Metallwürfel. Zuerst scheint er still, doch dann spürst du ein leichtes Vibrieren wie einen langsamen, rhythmischen Puls, fast wie ein Herzschlag.",
  },
  cube01: {
    title: "Der Würfel erwacht",
    message:
      "Du wachst in der Nacht auf. Der Würfel summt leise. Plötzlich erhebt sich eine sanfte, melodische Stimme aus ihm: „Vor langer Zeit blühte eine große Zivilisation auf dieser Welt, doch sie zerfiel und ihr Wissen ging in den Stürmen der Zeit verloren.“",
  },
  cube02: {
    title: "Der Kriegerstamm",
    message:
      "„In ferner Vergangenheit wurde ein Stamm wilder Krieger auserwählt, tief in den Höhlen zu leben. Ihre Bestimmung war es, etwas von großer Bedeutung zu bewachen.“",
  },
  cube03: {
    title: "Die unterirdische Stadt",
    message:
      "„Der Kriegerstamm wuchs zu einer weiten unterirdischen Stadt heran, sicher vor der Welt darüber, und beschützte noch immer, wofür sie einst ausersehen worden waren.“",
  },
  cube04: {
    title: "Der heilige Eid",
    message:
      "„Obwohl die Erinnerung an das Bewachte in Legenden verblas, hielt ihre Wachsamkeit an. Generationen lang hielten die Krieger ihren heiligen Eid und wachten über das, was am tiefsten Punkt der Stadt lag.“",
  },
  cube05: {
    title: "Das versiegelte Tor",
    message:
      "„Lange nachdem die Bewohner der unterirdischen Stadt starben, blieb der Gegenstand ihrer Hingabe: ein kolossales, undurchdringliches Tor, geschmiedet mit vergessener Technologie, verborgen in den tiefsten Kammern der Stadt.“",
  },
  cube06: {
    title: "Das Tor öffnet sich",
    message:
      "Als das Tor zerbricht, bebt der Würfel in deinen Händen und wird warm. Ein leises, aber dringliches Flüstern entweicht ihm: „Ich habe neue Erkenntnisse gewonnen.“",
  },
  cube07: {
    title: "Uralte Technologie",
    message:
      "„Die alte Zivilisation, die das Tor schuf, besaß Wissen und Technik, die weit über dieses Zeitalter hinausreichen. Sie fertigten sogar Geräte, die in ihre Schädel implantiert wurden und Geist und Körper stärkten.“",
  },
  cube08: {
    title: "Der Widerstand",
    message:
      "„Die Herrscher befahlen, dass jeder Bürger ein Gerät im Kopf tragen müsse. Eine kleine Gruppe begann, ihre Bedenken laut zu äußern, und bildete einen Widerstand, als sie die Gefahren in der Technologie erkannten.“",
  },
  cube09: {
    title: "Das goldene Zeitalter",
    message:
      "„Mit Hilfe der Geräte gedieh die Zivilisation. Eine Ära beispiellosen Friedens und Fortschritts begann; ihr Wissen und Können erreichte Höhen, die nie wieder erreicht wurden.“",
  },
  cube10: {
    title: "Der große Zusammenbruch",
    message:
      "„Wissen floss augenblicklich, und die Gesellschaft gedieh. Hinter dem Fortschritt lenkten die Schädelgeräte die Gedanken der Menschheit und verbanden Geister in einem stillen, unentrinnbaren Netz.“",
  },
  cube11: {
    title: "Der Schwarmgeist",
    message:
      "„Eines Tages, ohne Vorwarnung, fegte ein unvorstellbarer magnetoelektrischer Impuls über den Globus. Jedes Gerät der Zivilisation, auch die in den Schädeln, wurde vernichtet.“",
  },
  cube12: {
    title: "Ende der Zivilisation",
    message:
      "„Die wenigen Überlebenden konnten ohne die Geräte nicht leben. Die meisten starben. Die Zivilisation fiel zurück. Wissen versank in der Vergessenheit. Die Natur eroberte die Lande zurück und ließ nur begrabene Ruinen zurück, wo einst Größe stand.“",
  },
  cube13: {
    title: "Wiedergewonnene Daten",
    message:
      "Der Würfel pulsiert vor Energie, als du dich den erschlagenen Kreaturen näherst. Er scheint Informationen von irgendwoher zu extrahieren. Der Würfel wird warm und verarbeitet das wiedergewonnene Wissen.",
  },
  cube14a: {
    title: "Der Widerstand",
    message:
      "„Als der Widerstand sich den Schädelgeräten widersetzte, wurden sie in die Tiefen des Berges verbannt, hinter dem Tor eingeschlossen. Ohne Rückweg gruben sie immer tiefer. In Isolation und Finsternis zerfielen ihre Geister, und sie verfielen in Wahnsinn und Entartung.“",
  },
  cube14b: {
    title: "Das unbekannte Erz",
    message:
      "„Eines Tages fanden sie tief in der Erde einen Monolithen aus unbekanntem Erz. Daraus schmiedeten sie einen Sprengstoff, um das Tor zu zerstören. Doch die Bombe durchbrach das Tor nicht, sondern entfesselte einen elektromagnetischen Impuls über den ganzen Planeten, der alle Geräte vernichtete und die Zivilisation beendete.“",
  },
  cube14c: {
    title: "Das unbekannte Erz",
    message:
      "„Kurz nach der Explosion begann ein Mann in der Nähe zu dematerialisieren; seine Gestalt flackerte, halb durchsichtig für Sekunden. Vor Entsetzen und wahnsinnig vor dem Geschehen nahm er sich Momente später das Leben.“",
  },
  cube14d: {
    title: "Durch das Tor",
    message:
      "„In ihrer Verzweiflung vermuteten die Überlebenden, das Erz könnte ihnen helfen, durch das Tor zu gelangen. Mit den letzten Fragmenten bauten sie eine kleinere Bombe und stellten ihren gesündesten Mann damit vor das Tor. Gleich nach der Detonation wurde er gespenstisch, durchscheinend und verschwand durch das Tor.“",
  },
  cube15a: {
    title: "Erkenntnis",
    message:
      "Da erkennst du, dass die Kreaturen nicht angriffen, weil sie dich als einen der ihren erkannten. Du bist der Mann, der durch das Tor verschwand.",
  },
  cube15b: {
    title: "Erkenntnis",
    message:
      "Als ihre Geschichte endet, tritt einer der Überlebenden vor und zeigt auf dich: „Du bist der Mann, der durch das Tor verschwand. Du bist einer von uns.“",
  },
};

const byLocale = {
  en: cubeTextEn,
  de: cubeTextDe,
  fr: cubeTextEn,
  es: cubeTextEn,
  "zh-CN": cubeTextEn,
  ru: cubeTextEn,
};

function patchLocale(locale) {
  const file = path.join(ROOT, "client/src/i18n/locales", locale, "events.json");
  const events = JSON.parse(fs.readFileSync(file, "utf8"));
  const textByLocale = byLocale[locale];
  let updated = 0;
  for (const [id, text] of Object.entries(textByLocale)) {
    if (!events[id]) {
      console.warn(`${locale}: missing event key ${id}`);
      continue;
    }
    events[id].title = text.title;
    events[id].message = text.message;
    updated++;
  }
  fs.writeFileSync(file, JSON.stringify(events, null, 2) + "\n", "utf8");
  console.log(`${locale}: updated ${updated} cube events`);
}

for (const locale of Object.keys(byLocale)) {
  patchLocale(locale);
}
