/**
 * Resolve the build SHA players are actually on for a given admin env.
 * Prod always reads the live public site (`/api/version`), not the admin
 * process's own deploy SHA — so analyzing prod saves from local/Replit still
 * compares against what a-dark-cave.com is serving.
 */

import { SITE_ORIGIN } from "@shared/publicSeo";
import type { AdminEnv } from "./adminDashboardData";

const VERSION_FETCH_TIMEOUT_MS = 4_000;

export function publishedSiteOriginForAdminEnv(env: AdminEnv): string | null {
  if (env === "prod") return SITE_ORIGIN;
  return null;
}

/** Parse `{ sha }` from a `/api/version` JSON body. */
export function parseVersionResponseSha(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const sha = (body as { sha?: unknown }).sha;
  if (typeof sha !== "string") return null;
  const trimmed = sha.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * GET `{origin}/api/version` and return its `sha`, or null on failure.
 */
export async function fetchPublishedBuildSha(
  origin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const base = origin.replace(/\/$/, "");
  const url = `${base}/api/version`;
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(VERSION_FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return parseVersionResponseSha(await response.json());
  } catch {
    return null;
  }
}

/**
 * Build SHA to treat as "current" for save analysis of `env`.
 * - prod → live SITE_ORIGIN `/api/version` (falls back to `localDeploySha`)
 * - dev → this process's deploy SHA (the preview host serving admin)
 */
export async function resolveCurrentBuildShaForAdmin(
  env: AdminEnv,
  localDeploySha: string | null | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const local =
    typeof localDeploySha === "string" && localDeploySha.trim().length > 0
      ? localDeploySha.trim()
      : null;

  const origin = publishedSiteOriginForAdminEnv(env);
  if (!origin) return local;

  const published = await fetchPublishedBuildSha(origin, fetchImpl);
  return published ?? local;
}
