import { apiUrl } from "@/lib/apiUrl";

export type AccountPrivileges = {
  enabled: boolean;
  steamMode: boolean;
};

/** DEV builds always have multipliers; live env uses the account flag. */
export function resolveDevMode(accountEnabled = false): boolean {
  return import.meta.env.DEV === true || accountEnabled === true;
}

export async function fetchAccountPrivileges(
  accessToken: string,
): Promise<AccountPrivileges> {
  const res = await fetch(apiUrl("/api/account/dev-multipliers"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { enabled: false, steamMode: false };
  const data = (await res.json()) as {
    enabled?: unknown;
    steamMode?: unknown;
  };
  return {
    enabled: data.enabled === true,
    steamMode: data.steamMode === true,
  };
}
