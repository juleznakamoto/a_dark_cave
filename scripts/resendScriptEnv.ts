/**
 * Shared env resolution for Resend + Supabase CLI scripts.
 *
 * - NODE_ENV === "development" → *_DEV Supabase vars, else *_PROD
 * - Resend key: RESEND_API_KEY_PROD → RESEND_API_KEY → Bearer token in .cursor/mcp.json
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function getSupabaseConfig(): { url: string; serviceKey: string } {
  const dev = process.env.NODE_ENV === "development";
  const url = dev
    ? process.env.VITE_SUPABASE_URL_DEV
    : process.env.VITE_SUPABASE_URL_PROD;
  const serviceKey = dev
    ? process.env.SUPABASE_SERVICE_ROLE_KEY_DEV
    : process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;
  if (!url?.trim() || !serviceKey?.trim()) {
    const which = dev ? "DEV" : "PROD";
    throw new Error(
      `Missing VITE_SUPABASE_URL_${which} or SUPABASE_SERVICE_ROLE_KEY_${which} (NODE_ENV=${process.env.NODE_ENV ?? "undefined"})`,
    );
  }
  return { url: url.trim(), serviceKey: serviceKey.trim() };
}

function getResendApiKeyFromMcpJson(): string | null {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".cursor/mcp.json"), "utf8");
    const parsed = JSON.parse(raw) as {
      mcpServers?: {
        resend?: {
          env?: { RESEND_API_KEY?: string };
          headers?: { Authorization?: string };
        };
      };
    };
    const resend = parsed.mcpServers?.resend;
    const fromEnv = resend?.env?.RESEND_API_KEY?.trim();
    if (fromEnv) return fromEnv;
    const auth = resend?.headers?.Authorization ?? "";
    const match = auth.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

export function getResendApiKey(): string {
  const key =
    process.env.RESEND_API_KEY_PROD?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    getResendApiKeyFromMcpJson();
  if (!key) {
    throw new Error(
      "Missing Resend API key (set RESEND_API_KEY / RESEND_API_KEY_PROD or add a Bearer token in .cursor/mcp.json)",
    );
  }
  return key;
}
