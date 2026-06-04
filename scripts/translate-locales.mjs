/**
 * Deep-translate English i18n JSON values into target locales.
 * Uses a lightweight phrase map for common game terms plus structural copy for the rest.
 * Run after extract-i18n.mjs: node scripts/translate-locales.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCatalogPaths } from "./locale-catalog.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EN_DIR = path.join(ROOT, "client/src/i18n/locales/en");
const TARGETS = ["de", "fr", "es", "it", "pt-BR", "zh-CN", "ru"];

/** Phrase-level replacements applied before per-locale overrides. */
const PHRASE_MAPS = {
  de: [
    [/Wood/g, "Holz"],
    [/Stone/g, "Stein"],
    [/Food/g, "Nahrung"],
    [/Gold/g, "Gold"],
    [/Silver/g, "Silber"],
    [/Iron/g, "Eisen"],
    [/Coal/g, "Kohle"],
    [/Villager(s)?/g, "Dorfbewohner"],
    [/villagers/g, "Dorfbewohner"],
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
  ],
  fr: [
    [/Wood/g, "Bois"],
    [/Stone/g, "Pierre"],
    [/Food/g, "Nourriture"],
    [/Gold/g, "Or"],
    [/Silver/g, "Argent"],
    [/Iron/g, "Fer"],
    [/Coal/g, "Charbon"],
    [/Villager(s)?/g, "Villageois"],
    [/villagers/g, "villageois"],
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
  ],
  es: [
    [/Wood/g, "Madera"],
    [/Stone/g, "Piedra"],
    [/Food/g, "Comida"],
    [/Gold/g, "Oro"],
    [/Silver/g, "Plata"],
    [/Iron/g, "Hierro"],
    [/Coal/g, "Carbón"],
    [/Villager(s)?/g, "Aldeano(s)"],
    [/villagers/g, "aldeanos"],
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
  ],
  it: [
    [/Wood/g, "Legno"],
    [/Stone/g, "Pietra"],
    [/Food/g, "Cibo"],
    [/Gold/g, "Oro"],
    [/Silver/g, "Argento"],
    [/Iron/g, "Ferro"],
    [/Coal/g, "Carbone"],
    [/Villager(s)?/g, "Abitante(i)"],
    [/villagers/g, "abitanti"],
    [/Village/g, "Villaggio"],
    [/Cave/g, "Caverna"],
    [/Forest/g, "Foresta"],
    [/Build/g, "Costruire"],
    [/Gather/g, "Raccogliere"],
    [/Investigate/g, "Investigare"],
    [/Ignore/g, "Ignorare"],
    [/Continue/g, "Continua"],
    [/Close/g, "Chiudi"],
    [/Save/g, "Salva"],
    [/Fight/g, "Combatti"],
    [/Retreat/g, "Ritirati"],
  ],
  "pt-BR": [
    [/Wood/g, "Madeira"],
    [/Stone/g, "Pedra"],
    [/Food/g, "Comida"],
    [/Gold/g, "Ouro"],
    [/Silver/g, "Prata"],
    [/Iron/g, "Ferro"],
    [/Coal/g, "Carvão"],
    [/Villager(s)?/g, "Aldeão(ões)"],
    [/villagers/g, "aldeões"],
    [/Village/g, "Aldeia"],
    [/Cave/g, "Caverna"],
    [/Forest/g, "Floresta"],
    [/Build/g, "Construir"],
    [/Gather/g, "Coletar"],
    [/Investigate/g, "Investigar"],
    [/Ignore/g, "Ignorar"],
    [/Continue/g, "Continuar"],
    [/Close/g, "Fechar"],
    [/Save/g, "Salvar"],
    [/Fight/g, "Lutar"],
    [/Retreat/g, "Recuar"],
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
  ],
};

function translateString(text, locale) {
  if (typeof text !== "string") return text;
  let out = text;
  const map = PHRASE_MAPS[locale] ?? [];
  for (const [re, repl] of map) {
    out = out.replace(re, repl);
  }
  return out;
}

function translateDeep(value, locale) {
  if (typeof value === "string") return translateString(value, locale);
  if (Array.isArray(value)) return value.map((v) => translateDeep(v, locale));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, translateDeep(v, locale)]),
    );
  }
  return value;
}

function copyLocaleFile(rel, locale) {
  const enPath = path.join(EN_DIR, rel);
  if (!fs.existsSync(enPath)) return;
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const outPath = path.join(ROOT, "client/src/i18n/locales", locale, rel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const translated = translateDeep(en, locale);
  fs.writeFileSync(outPath, JSON.stringify(translated, null, 2) + "\n");
}

export function generateLocale(locale) {
  const catalogPaths = listCatalogPaths(EN_DIR);
  for (const rel of catalogPaths) {
    copyLocaleFile(rel, locale);
  }
  console.log(`Generated locale: ${locale} (${catalogPaths.length} catalog files)`);
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  for (const locale of TARGETS) {
    generateLocale(locale);
  }
}
