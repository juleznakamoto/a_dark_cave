/**
 * Admin dashboard data fetchers. Split by section so the client can lazy-load
 * per tab and avoid shipping full game_state blobs when not needed.
 */

export const ADMIN_DATA_CLICKS_LIMIT = 10_000;
export const ADMIN_DATA_SAVES_LIMIT = 10_000;
export const ADMIN_SAVE_ANALYSIS_LIMIT = 100;
/** Bump when slimGameStateForAdmin shape changes so clients can bust cache. */
export const ADMIN_SAVES_SLIM_VERSION = 3;
export const PURCHASES_LIST_COLUMNS =
  "user_id,item_id,item_name,price_paid,purchased_at,bundle_id,country,cruel_mode,currency,stripe_payment_intent_id,stripe_fx_quote_id,reporting_eur_cents,reporting_usd_cents,payment_type";

export type AdminEnv = "dev" | "prod";

/** Fields from game_state that admin tabs actually read (see client/src/pages/admin). */
export function slimGameStateForAdmin(
  gameState: unknown,
): Record<string, unknown> | null {
  if (!gameState || typeof gameState !== "object") {
    return null;
  }

  const gs = gameState as Record<string, unknown>;

  const slimEvents: Record<string, boolean> = {};
  const events = gs.events;
  if (events && typeof events === "object") {
    for (const [key, value] of Object.entries(
      events as Record<string, unknown>,
    )) {
      if (key.startsWith("cube") && value === true) {
        slimEvents[key] = true;
      }
    }
  }

  const clothing = gs.clothing;
  let slimClothing: { gifted_ring?: boolean } | undefined;
  if (clothing && typeof clothing === "object") {
    const gifted = (clothing as Record<string, unknown>).gifted_ring;
    if (gifted === true) {
      slimClothing = { gifted_ring: true };
    }
  }

  const flags = gs.flags;
  let slimFlags: { gameStarted?: boolean } | undefined;
  if (flags && typeof flags === "object") {
    if ((flags as Record<string, unknown>).gameStarted === true) {
      slimFlags = { gameStarted: true };
    }
  }

  const buildings = gs.buildings;
  let slimBuildings: { woodenHut?: number; stoneHut?: number } | undefined;
  if (buildings && typeof buildings === "object") {
    const b = buildings as Record<string, unknown>;
    const coerceCount = (raw: unknown): number | undefined => {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };
    const woodenHut = coerceCount(b.woodenHut);
    const stoneHut = coerceCount(b.stoneHut);
    if (woodenHut !== undefined || stoneHut !== undefined) {
      slimBuildings = {};
      if (woodenHut !== undefined) slimBuildings.woodenHut = woodenHut;
      if (stoneHut !== undefined) slimBuildings.stoneHut = stoneHut;
    }
  }

  const slim: Record<string, unknown> = {
    playTime: gs.playTime,
    gameComplete: gs.gameComplete,
    events: slimEvents,
    sleepUpgrades: gs.sleepUpgrades,
    buttonUpgrades: gs.buttonUpgrades,
    isUserSignedIn: gs.isUserSignedIn,
    signupWelcomeGoldClaimed: gs.signupWelcomeGoldClaimed,
    referralCount: gs.referralCount,
    referrals: gs.referrals,
    social_media_rewards: gs.social_media_rewards,
    socialPromoExclusiveRewardPending: gs.socialPromoExclusiveRewardPending,
  };

  // Hut-ladder cohort excludes referred accounts (bonus-farm / self-refer stubs).
  if (gs.referralProcessed === true) {
    slim.referralProcessed = true;
  }

  if (slimFlags) {
    slim.flags = slimFlags;
  }
  if (slimBuildings) {
    slim.buildings = slimBuildings;
  }
  if (slimClothing) {
    slim.clothing = slimClothing;
  }

  return slim;
}

function oneYearAgoFilter(now = new Date()): string {
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return oneYearAgo.toISOString();
}

function thirtyDaysAgoFilter(now = new Date()): string {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return thirtyDaysAgo.toISOString();
}

export async function fetchAdminClicks(
  adminClient: ReturnType<
    typeof import("./supabaseServerClient").createServerSupabaseClient
  >,
) {
  const { data, error } = await adminClient
    .from("button_clicks")
    .select("user_id,timestamp,clicks,resources")
    .gte("timestamp", thirtyDaysAgoFilter())
    .order("timestamp", { ascending: false })
    .limit(ADMIN_DATA_CLICKS_LIMIT);

  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function fetchAdminSavesSlim(
  adminClient: ReturnType<
    typeof import("./supabaseServerClient").createServerSupabaseClient
  >,
) {
  const { data, error } = await adminClient
    .from("game_saves")
    .select("user_id,username,game_state,game_stats,updated_at,created_at")
    .or(`created_at.gte.${oneYearAgoFilter()},updated_at.gte.${oneYearAgoFilter()}`)
    .order("updated_at", { ascending: false })
    .limit(ADMIN_DATA_SAVES_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...row,
    game_state: slimGameStateForAdmin(row.game_state),
  }));
}

/** Last N saves (by updated_at) with full game_state for integrity analysis. */
export async function fetchAdminSaveAnalysisInputs(
  adminClient: ReturnType<
    typeof import("./supabaseServerClient").createServerSupabaseClient
  >,
  limit = ADMIN_SAVE_ANALYSIS_LIMIT,
) {
  type SaveAnalysisRow = {
    id: string;
    user_id: string | null;
    username: string | null;
    game_state: unknown;
    game_stats: unknown;
    game_state_v2?: unknown;
    save_revision?: number | null;
    schema_version?: number | null;
    updated_at: string;
    created_at: string;
  };

  const withV2 = await adminClient
    .from("game_saves")
    .select(
      "id,user_id,username,game_state,game_stats,game_state_v2,save_revision,schema_version,updated_at,created_at",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (!withV2.error) {
    return (withV2.data ?? []) as SaveAnalysisRow[];
  }

  // Migration 028 not applied yet — keep legacy admin analysis working.
  const missingV2Column =
    withV2.error.code === "42703" ||
    /game_state_v2|save_revision|schema_version/i.test(
      withV2.error.message ?? "",
    );
  if (!missingV2Column) {
    throw withV2.error;
  }

  const legacy = await adminClient
    .from("game_saves")
    .select("id,user_id,username,game_state,game_stats,updated_at,created_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (legacy.error) {
    throw legacy.error;
  }

  return (legacy.data ?? []) as SaveAnalysisRow[];
}

export async function fetchAdminPurchases(
  adminClient: ReturnType<
    typeof import("./supabaseServerClient").createServerSupabaseClient
  >,
) {
  const PURCHASES_PAGE_SIZE = 1000;
  const allPurchases: Record<string, unknown>[] = [];
  let purchaseOffset = 0;

  while (true) {
    const { data: purchasePage, error: purchasesPageError } = await adminClient
      .from("purchases")
      .select(PURCHASES_LIST_COLUMNS)
      .order("id", { ascending: true })
      .range(purchaseOffset, purchaseOffset + PURCHASES_PAGE_SIZE - 1);

    if (purchasesPageError) {
      throw purchasesPageError;
    }
    if (!purchasePage || purchasePage.length === 0) {
      break;
    }
    allPurchases.push(...purchasePage);
    if (purchasePage.length < PURCHASES_PAGE_SIZE) {
      break;
    }
    purchaseOffset += PURCHASES_PAGE_SIZE;
  }

  allPurchases.sort(
    (a: { purchased_at?: string }, b: { purchased_at?: string }) => {
      const ta = a.purchased_at ? new Date(a.purchased_at).getTime() : 0;
      const tb = b.purchased_at ? new Date(b.purchased_at).getTime() : 0;
      return tb - ta;
    },
  );

  return allPurchases;
}

export type AdminMetricsPayload = {
  totalUserCount: number;
  registrationMethodStats: {
    emailRegistrations: number;
    googleRegistrations: number;
  };
  authSignups: Array<{ id: string; created_at: string }>;
  marketingMetrics: {
    marketingUsersPrompted: number;
    marketingUsersOptedIn: number;
    marketingOptInRate: number;
  };
  accountsDeletedAnonymized: number;
  purchaseMetrics: {
    total_revenue_eur_cents: number;
    total_revenue_usd_cents: number;
    paid_buyer_count: number;
    total_revenue_eur_unified_cents: number | null;
  } | null;
  referralMetrics: unknown;
};

export async function fetchAdminMetrics(
  adminClient: ReturnType<
    typeof import("./supabaseServerClient").createServerSupabaseClient
  >,
  log: (message: string, ...args: unknown[]) => void,
): Promise<AdminMetricsPayload> {
  const [marketingMetricsRpc, authDashboardRpc, purchaseMetricsRpc, referralRpc] =
    await Promise.all([
      adminClient.rpc("admin_marketing_dashboard_metrics"),
      adminClient.rpc("admin_auth_dashboard_stats"),
      adminClient.rpc("admin_purchase_metrics"),
      adminClient.rpc("admin_referral_dashboard"),
    ]);

  let totalUserCount = 0;
  let registrationMethodStats = {
    emailRegistrations: 0,
    googleRegistrations: 0,
  };
  let authSignups: Array<{ id: string; created_at: string }> = [];
  let marketingMetrics = {
    marketingUsersPrompted: 0,
    marketingUsersOptedIn: 0,
    marketingOptInRate: 0,
  };
  let accountsDeletedAnonymized = 0;

  if (marketingMetricsRpc.error) {
    log(
      "⚠️ admin_marketing_dashboard_metrics skipped:",
      marketingMetricsRpc.error.message ?? marketingMetricsRpc.error,
    );
  } else {
    const mm = marketingMetricsRpc.data as Record<string, unknown> | null;
    if (mm && typeof mm === "object") {
      marketingMetrics = {
        marketingUsersPrompted: Number(mm.marketing_users_prompted) || 0,
        marketingUsersOptedIn: Number(mm.marketing_users_opted_in) || 0,
        marketingOptInRate: Number(mm.marketing_opt_in_rate) || 0,
      };
      accountsDeletedAnonymized =
        Number(mm.accounts_deleted_anonymized) || 0;
    }
  }

  if (authDashboardRpc.error) {
    log(
      "⚠️ admin_auth_dashboard_stats skipped:",
      authDashboardRpc.error.message ?? authDashboardRpc.error,
    );
  } else {
    const authPayload = authDashboardRpc.data as Record<string, unknown> | null;
    if (authPayload && typeof authPayload === "object") {
      totalUserCount = Number(authPayload.total_user_count) || 0;
      const rms = authPayload.registration_method_stats as
        | {
          emailRegistrations?: number;
          googleRegistrations?: number;
        }
        | undefined;
      if (rms && typeof rms === "object") {
        registrationMethodStats = {
          emailRegistrations: Number(rms.emailRegistrations) || 0,
          googleRegistrations: Number(rms.googleRegistrations) || 0,
        };
      }
      const signups = authPayload.auth_signups;
      if (Array.isArray(signups)) {
        authSignups = signups.map((row: { id?: unknown; created_at?: unknown }) => ({
          id: String(row.id),
          created_at: String(row.created_at),
        }));
      }
    }
  }

  let purchaseMetrics: AdminMetricsPayload["purchaseMetrics"] = null;
  if (purchaseMetricsRpc.error) {
    log(
      "⚠️ admin_purchase_metrics skipped:",
      purchaseMetricsRpc.error.message ?? purchaseMetricsRpc.error,
    );
  } else {
    const pm = purchaseMetricsRpc.data as Record<string, unknown> | null;
    if (
      pm &&
      typeof pm === "object" &&
      "total_revenue_eur_cents" in pm &&
      "total_revenue_usd_cents" in pm &&
      "paid_buyer_count" in pm
    ) {
      const unifiedRaw = pm.total_revenue_eur_unified_cents;
      purchaseMetrics = {
        total_revenue_eur_cents: Number(pm.total_revenue_eur_cents) || 0,
        total_revenue_usd_cents: Number(pm.total_revenue_usd_cents) || 0,
        paid_buyer_count: Number(pm.paid_buyer_count) || 0,
        total_revenue_eur_unified_cents:
          unifiedRaw !== undefined && unifiedRaw !== null
            ? Number(unifiedRaw) || 0
            : null,
      };
    }
  }

  let referralMetrics: unknown = null;
  if (referralRpc.error) {
    log(
      "⚠️ admin_referral_dashboard skipped:",
      referralRpc.error.message ?? referralRpc.error,
    );
  } else if (referralRpc.data) {
    referralMetrics = referralRpc.data;
  }

  return {
    totalUserCount,
    registrationMethodStats,
    authSignups,
    marketingMetrics,
    accountsDeletedAnonymized,
    purchaseMetrics,
    referralMetrics,
  };
}
