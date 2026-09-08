import { apiUrl } from "@/lib/apiUrl";

/** DEV builds always have multipliers; live env uses the account flag. */
export function resolveDevMode(accountEnabled = false): boolean {
  return import.meta.env.DEV === true || accountEnabled === true;
}

export async function fetchAccountDevMultipliersEnabled(
  accessToken: string,
): Promise<boolean> {
  const res = await fetch(apiUrl("/api/account/dev-multipliers"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { enabled?: unknown };
  return data.enabled === true;
}
