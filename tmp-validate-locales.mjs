import fs from "fs";
import { parseLocaleJson } from "./scripts/parse-locale-json.mjs";

for (const l of ["de", "fr", "es", "it", "pt-BR", "ru", "zh-CN", "en"]) {
  for (const f of ["shell", "playlight"]) {
    const p = `client/src/i18n/locales/${l}/ui/${f}.json`;
    parseLocaleJson(fs.readFileSync(p, "utf8"));
    console.log(p, "ok");
  }
}
