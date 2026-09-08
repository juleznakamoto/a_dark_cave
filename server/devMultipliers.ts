import {
  accountHasDevMultipliers,
  BUILT_IN_DEV_MULTIPLIER_EMAILS,
  DEV_MULTIPLIERS_APP_METADATA_KEY,
  isEmailOnAllowlist,
  parseEmailAllowlist,
} from "@shared/devMultipliers";

export type DevMultiplierAccount = {
  user_id: string;
  email: string | null;
  devMultipliers: boolean;
  devMultipliersLockedByEnv: boolean;
};

type AuthUserLike = {
  id: string;
  email?: string | null;
  app_metadata?: unknown;
};

export function getDevMultiplierEmailAllowlist(
  env: NodeJS.ProcessEnv = process.env,
): Set<string> {
  const fromEnv = parseEmailAllowlist(
    env.DEV_MULTIPLIER_EMAILS?.trim() ||
    env.VITE_DEV_MULTIPLIER_EMAILS?.trim() ||
    "",
  );
  return new Set([
    ...BUILT_IN_DEV_MULTIPLIER_EMAILS.map((email) => email.toLowerCase()),
    ...fromEnv,
  ]);
}

export function buildDevMultiplierAccount(
  user: AuthUserLike,
  allowlist: Set<string> = getDevMultiplierEmailAllowlist(),
): DevMultiplierAccount {
  const email = user.email?.trim() ? user.email : null;
  const fromEnv = isEmailOnAllowlist(email, allowlist);
  return {
    user_id: user.id,
    email,
    devMultipliers: accountHasDevMultipliers({
      email,
      appMetadata: user.app_metadata,
      allowlist,
    }),
    devMultipliersLockedByEnv: fromEnv,
  };
}

export function sessionHasDevMultipliers(user: {
  email?: string | null;
  app_metadata?: unknown;
}): boolean {
  return accountHasDevMultipliers({
    email: user.email,
    appMetadata: user.app_metadata,
    allowlist: getDevMultiplierEmailAllowlist(),
  });
}

export function nextDevMultipliersAppMetadata(
  current: unknown,
  enabled: boolean,
): Record<string, unknown> {
  const base =
    current && typeof current === "object"
      ? { ...(current as Record<string, unknown>) }
      : {};
  return {
    ...base,
    [DEV_MULTIPLIERS_APP_METADATA_KEY]: enabled,
  };
}

type AdminAuthClient = {
  auth: {
    admin: {
      getUserById: (id: string) => Promise<{
        data: { user: AuthUserLike | null } | null;
        error: { message?: string } | null;
      }>;
      listUsers: (params: { page: number; perPage: number }) => Promise<{
        data: { users?: AuthUserLike[] } | null;
        error: { message?: string } | null;
      }>;
    };
  };
};

const EMAIL_LOOKUP_PAGE_SIZE = 1000;
const EMAIL_LOOKUP_MAX_PAGES = 20;

export async function findAuthUserById(
  adminClient: AdminAuthClient,
  userId: string,
): Promise<AuthUserLike | null> {
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !data?.user?.id) return null;
  return data.user;
}

export async function findAuthUserByEmail(
  adminClient: AdminAuthClient,
  email: string,
): Promise<AuthUserLike | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  for (let page = 1; page <= EMAIL_LOOKUP_MAX_PAGES; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: EMAIL_LOOKUP_PAGE_SIZE,
    });
    if (error) {
      throw new Error(error.message || "Failed to lookup user by email");
    }
    const users = data?.users ?? [];
    const match = users.find((u) => u.email?.trim().toLowerCase() === target);
    if (match) return match;
    if (users.length < EMAIL_LOOKUP_PAGE_SIZE) return null;
  }
  return null;
}
