/**
 * Build Resend CSVs + token SQL from a Supabase MCP JSON export.
 *
 * Input JSON: array of { user_id, email, raw_user_meta_data, created_at, cohort }
 * Output:
 *   pre-consent.csv, subscribed.csv
 *   insert-unsubscribe-tokens.sql
 *
 * Usage:
 *   node tmp/resend-rebuild/build-import-from-export.mjs
 */

import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const DIR = resolve("tmp/resend-rebuild");
const ORIGIN = "https://a-dark-cave.com";

function namesFromMetadata(meta) {
  if (!meta || typeof meta !== "object") return { first_name: "", last_name: "" };
  const fn = meta.first_name ?? meta.given_name;
  const ln = meta.last_name ?? meta.family_name;
  if (typeof fn === "string" || typeof ln === "string") {
    return {
      first_name: typeof fn === "string" ? fn : "",
      last_name: typeof ln === "string" ? ln : "",
    };
  }
  const full = meta.full_name ?? meta.name;
  if (typeof full === "string" && full.trim()) {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return { first_name: parts[0], last_name: "" };
    return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
  }
  return { first_name: "", last_name: "" };
}

function csvCell(value) {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function loadRows() {
  const files = readdirSync(DIR)
    .filter((f) => /^page-\d+\.json$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  if (!files.length) throw new Error(`No page-*.json files in ${DIR}`);
  const rows = [];
  for (const f of files) {
    const parsed = JSON.parse(readFileSync(join(DIR, f), "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`${f} is not a JSON array`);
    rows.push(...parsed);
  }
  return rows;
}

function main() {
  const raw = loadRows();
  // Dedup by email: subscribed wins (already applied in SQL, but belt+suspenders)
  const byEmail = new Map();
  for (const row of raw) {
    const email = String(row.email ?? "").trim();
    if (!email) continue;
    const key = email.toLowerCase();
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, row);
      continue;
    }
    if (existing.cohort !== "subscribed" && row.cohort === "subscribed") {
      byEmail.set(key, row);
    }
  }

  const pre = [];
  const sub = [];
  for (const row of byEmail.values()) {
    const names = namesFromMetadata(row.raw_user_meta_data);
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken, "utf8").digest("hex");
    const enriched = {
      user_id: row.user_id,
      email: String(row.email).trim(),
      first_name: names.first_name,
      last_name: names.last_name,
      created_at: row.created_at,
      cohort: row.cohort,
      raw_token: rawToken,
      token_hash: tokenHash,
      unsubscribe_url: `${ORIGIN}/unsubscribe?token=${encodeURIComponent(rawToken)}`,
    };
    if (row.cohort === "subscribed") sub.push(enriched);
    else pre.push(enriched);
  }

  const byCreated = (a, b) =>
    Date.parse(a.created_at ?? 0) - Date.parse(b.created_at ?? 0);
  pre.sort(byCreated);
  sub.sort(byCreated);

  const toCsv = (rows) => {
    const header = ["email", "first_name", "last_name", "unsubscribed", "unsubscribe_url"];
    const lines = rows.map((r) =>
      [r.email, r.first_name, r.last_name, "false", r.unsubscribe_url]
        .map(csvCell)
        .join(","),
    );
    return `${header.join(",")}\n${lines.join("\n")}\n`;
  };

  writeFileSync(join(DIR, "pre-consent.csv"), toCsv(pre));
  writeFileSync(join(DIR, "subscribed.csv"), toCsv(sub));

  const all = [...pre, ...sub];
  const sqlLines = [
    "-- Run in Supabase SQL editor (PROD) after Resend import.",
    "-- Inserts one-time unsubscribe token hashes matching CSV unsubscribe_url values.",
    "BEGIN;",
  ];
  const chunkSize = 200;
  for (let i = 0; i < all.length; i += chunkSize) {
    const chunk = all.slice(i, i + chunkSize);
    sqlLines.push(
      "INSERT INTO public.marketing_unsubscribe_tokens (user_id, token_hash, expires_at) VALUES",
    );
    sqlLines.push(
      chunk
        .map(
          (r) =>
            `  (${sqlQuote(r.user_id)}::uuid, ${sqlQuote(r.token_hash)}, now() + interval '90 days')`,
        )
        .join(",\n") +
        "\nON CONFLICT (token_hash) DO NOTHING;",
    );
  }
  sqlLines.push("COMMIT;");
  writeFileSync(join(DIR, "insert-unsubscribe-tokens.sql"), sqlLines.join("\n") + "\n");

  console.log(
    `Built CSVs: pre-consent=${pre.length}, subscribed=${sub.length}, tokens_sql=${all.length}`,
  );
}

main();
