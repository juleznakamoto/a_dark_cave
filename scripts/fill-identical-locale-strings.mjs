/**
 * Fill locale strings that are still identical to English (phrase-map translation).
 * Run after sync-locale-keys.mjs: node scripts/fill-identical-locale-strings.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCatalogPaths } from "./locale-catalog.mjs";
import { readLocaleJson } from "./parse-locale-json.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EN_DIR = path.join(ROOT, "client/src/i18n/locales/en");
const TARGETS = ["de", "fr", "es", "zh-CN", "ru"];

const PHRASE_MAPS = {
  de: [
    [/Wood/g, "Holz"],
    [/Stone/g, "Stein"],
    [/Food/g, "Nahrung"],
    [/Silver/g, "Silber"],
    [/Iron/g, "Eisen"],
    [/Coal/g, "Kohle"],
    [/Villagers/g, "Dorfbewohner"],
    [/villagers/g, "Dorfbewohner"],
    [/Villager/g, "Dorfbewohner"],
    [/Village/g, "Dorf"],
    [/Cave/g, "Höhle"],
    [/Forest/g, "Wald"],
    [/Build/g, "Baue"],
    [/Gather/g, "Sammle"],
    [/Investigate/g, "Untersuchen"],
    [/Ignore/g, "Ignorieren"],
    [/Continue/g, "Weiter"],
    [/Close/g, "Schließen"],
    [/Save/g, "Speichern"],
    [/Fight/g, "Kämpfen"],
    [/Retreat/g, "Zurückziehen"],
    [/Sleep/g, "Schlafen"],
    [/Focus/g, "Fokus"],
    [/Produce/g, "Produzieren"],
    [/Heal/g, "Heilen"],
    [/Repair/g, "Reparieren"],
    [/Sacrifice/g, "Opfern"],
    [/Buy/g, "Kaufen"],
    [/Sell/g, "Verkaufen"],
    [/Sign In/g, "Anmelden"],
    [/Sign Up/g, "Registrieren"],
    [/Loading/g, "Wird geladen"],
    [/Error/g, "Fehler"],
    [/Success/g, "Erfolg"],
  ],
  fr: [
    [/Wood/g, "Bois"],
    [/Stone/g, "Pierre"],
    [/Food/g, "Nourriture"],
    [/Gold/g, "Or"],
    [/Silver/g, "Argent"],
    [/Iron/g, "Fer"],
    [/Coal/g, "Charbon"],
    [/Villagers/g, "Villageois"],
    [/villagers/g, "villageois"],
    [/Villager/g, "Villageois"],
    [/Village/g, "Village"],
    [/Cave/g, "Grotte"],
    [/Forest/g, "Forêt"],
    [/Build/g, "Construire"],
    [/Gather/g, "Collecter"],
    [/Investigate/g, "Enquêter"],
    [/Ignore/g, "Ignorer"],
    [/Continue/g, "Continuer"],
    [/Close/g, "Fermer"],
    [/Save/g, "Sauvegarder"],
    [/Fight/g, "Combattre"],
    [/Retreat/g, "Battre en retraite"],
    [/Sleep/g, "Dormir"],
    [/Focus/g, "Concentration"],
    [/Produce/g, "Produire"],
    [/Heal/g, "Soigner"],
    [/Repair/g, "Réparer"],
    [/Sacrifice/g, "Sacrifier"],
    [/Buy/g, "Acheter"],
    [/Sell/g, "Vendre"],
  ],
  es: [
    [/Wood/g, "Madera"],
    [/Stone/g, "Piedra"],
    [/Food/g, "Comida"],
    [/Gold/g, "Oro"],
    [/Silver/g, "Plata"],
    [/Iron/g, "Hierro"],
    [/Coal/g, "Carbón"],
    [/Villagers/g, "Aldeanos"],
    [/villagers/g, "aldeanos"],
    [/Villager/g, "Aldeano"],
    [/Village/g, "Aldea"],
    [/Cave/g, "Cueva"],
    [/Forest/g, "Bosque"],
    [/Build/g, "Construir"],
    [/Gather/g, "Recoger"],
    [/Investigate/g, "Investigar"],
    [/Ignore/g, "Ignorar"],
    [/Continue/g, "Continuar"],
    [/Close/g, "Cerrar"],
    [/Save/g, "Guardar"],
    [/Fight/g, "Luchar"],
    [/Retreat/g, "Retirarse"],
    [/Sleep/g, "Dormir"],
    [/Focus/g, "Concentración"],
    [/Produce/g, "Producir"],
    [/Heal/g, "Curar"],
    [/Repair/g, "Reparar"],
    [/Sacrifice/g, "Sacrificar"],
    [/Buy/g, "Comprar"],
    [/Sell/g, "Vender"],
  ],
  "zh-CN": [
    [/Wood/g, "木材"],
    [/Stone/g, "石头"],
    [/Food/g, "食物"],
    [/Gold/g, "黄金"],
    [/Silver/g, "白银"],
    [/Iron/g, "铁"],
    [/Coal/g, "煤炭"],
    [/Villagers/g, "村民"],
    [/villagers/g, "村民"],
    [/Villager/g, "村民"],
    [/Village/g, "村庄"],
    [/Cave/g, "洞穴"],
    [/Forest/g, "森林"],
    [/Build/g, "建造"],
    [/Gather/g, "采集"],
    [/Investigate/g, "调查"],
    [/Ignore/g, "忽略"],
    [/Continue/g, "继续"],
    [/Close/g, "关闭"],
    [/Save/g, "保存"],
    [/Fight/g, "战斗"],
    [/Retreat/g, "撤退"],
    [/Sleep/g, "睡眠"],
    [/Focus/g, "专注"],
    [/Produce/g, "生产"],
    [/Heal/g, "治疗"],
    [/Repair/g, "修复"],
    [/Sacrifice/g, "献祭"],
    [/Buy/g, "购买"],
    [/Sell/g, "出售"],
  ],
  ru: [
    [/Wood/g, "Древесина"],
    [/Stone/g, "Камень"],
    [/Food/g, "Еда"],
    [/Gold/g, "Золото"],
    [/Silver/g, "Серебро"],
    [/Iron/g, "Железо"],
    [/Coal/g, "Уголь"],
    [/Villagers/g, "Жители"],
    [/villagers/g, "жители"],
    [/Villager/g, "Житель"],
    [/Village/g, "Деревня"],
    [/Cave/g, "Пещера"],
    [/Forest/g, "Лес"],
    [/Build/g, "Построить"],
    [/Gather/g, "Собрать"],
    [/Investigate/g, "Исследовать"],
    [/Ignore/g, "Игнорировать"],
    [/Continue/g, "Продолжить"],
    [/Close/g, "Закрыть"],
    [/Save/g, "Сохранить"],
    [/Fight/g, "Сражаться"],
    [/Retreat/g, "Отступить"],
    [/Sleep/g, "Сон"],
    [/Focus/g, "Фокус"],
    [/Produce/g, "Производить"],
    [/Heal/g, "Лечить"],
    [/Repair/g, "Чинить"],
    [/Sacrifice/g, "Жертвовать"],
    [/Buy/g, "Купить"],
    [/Sell/g, "Продать"],
  ],
};

function translateString(text, locale) {
  if (typeof text !== "string") return text;
  let out = text;
  for (const [re, repl] of PHRASE_MAPS[locale] ?? []) {
    out = out.replace(re, repl);
  }
  return out;
}

function fillIdentical(enVal, locVal, locale) {
  if (typeof enVal === "string") {
    if (locVal === enVal) return translateString(enVal, locale);
    return locVal;
  }
  if (Array.isArray(enVal)) {
    return enVal.map((v, i) => fillIdentical(v, locVal?.[i], locale));
  }
  if (enVal && typeof enVal === "object") {
    return Object.fromEntries(
      Object.entries(enVal).map(([k, v]) => [
        k,
        fillIdentical(v, locVal?.[k], locale),
      ]),
    );
  }
  return locVal;
}

const catalogPaths = listCatalogPaths(EN_DIR);

let totalFilled = 0;

for (const locale of TARGETS) {
  for (const rel of catalogPaths) {
    const en = JSON.parse(fs.readFileSync(path.join(EN_DIR, rel), "utf8"));
    const locPath = path.join(ROOT, "client/src/i18n/locales", locale, rel);
    const loc = readLocaleJson(locPath, fs);
    const before = JSON.stringify(loc);
    const filled = fillIdentical(en, loc, locale);
    const after = JSON.stringify(filled);
    if (before !== after) {
      totalFilled++;
      fs.mkdirSync(path.dirname(locPath), { recursive: true });
      fs.writeFileSync(locPath, JSON.stringify(filled, null, 2) + "\n");
    }
  }
  console.log(`Filled identical strings: ${locale}`);
}

console.log(`Updated ${totalFilled} catalog files`);
