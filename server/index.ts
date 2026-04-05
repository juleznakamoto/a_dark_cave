import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { setupVite, serveStatic, log } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createPaymentIntent, verifyPayment } from "./stripe";
import { processReferral } from "./referral";
import { Filter } from "bad-words";

// Supabase config endpoint for production
const getSupabaseConfig = () => {
  const isDev = process.env.NODE_ENV === "development";
  return {
    supabaseUrl: isDev
      ? process.env.VITE_SUPABASE_URL_DEV
      : process.env.VITE_SUPABASE_URL_PROD,
    supabaseAnonKey: isDev
      ? process.env.VITE_SUPABASE_ANON_KEY_DEV
      : process.env.VITE_SUPABASE_ANON_KEY_PROD,
  };
};

/** Semver from repo root package.json (read once at startup). */
function readRootPackageVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, "..", "package.json");
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { version?: string };
    return typeof pkg.version === "string" && pkg.version.length > 0
      ? pkg.version
      : "unknown";
  } catch {
    return "unknown";
  }
}

const APP_PACKAGE_VERSION = readRootPackageVersion();

type BuildMeta = { sha: string | null; builtAt: string | null };

/** Written by `node scripts/write-build-meta.mjs` at the end of `npm run build`. */
function readBuildMetaFile(): BuildMeta {
  const candidates = [
    path.join(__dirname, "build-meta.json"),
    path.join(__dirname, "..", "dist", "build-meta.json"),
  ];
  for (const metaPath of candidates) {
    try {
      if (!fs.existsSync(metaPath)) continue;
      const raw = fs.readFileSync(metaPath, "utf-8");
      const j = JSON.parse(raw) as { sha?: unknown; builtAt?: unknown };
      const sha =
        typeof j.sha === "string" && j.sha.length > 0 ? j.sha : null;
      const builtAt =
        typeof j.builtAt === "string" && j.builtAt.length > 0
          ? j.builtAt
          : null;
      return { sha, builtAt };
    } catch {
      /* try next path */
    }
  }
  return { sha: null, builtAt: null };
}

const BUILD_META_FILE = readBuildMetaFile();

/** Deploy commit id from CI/host env (first non-empty wins). Overrides build-meta. */
function readDeployGitShaFromEnv(): string | null {
  for (const key of [
    "GIT_COMMIT_SHA",
    "GITHUB_SHA",
    "VERCEL_GIT_COMMIT_SHA",
    "RAILWAY_GIT_COMMIT_SHA",
  ] as const) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

/** Optional build timestamp from env. Overrides build-meta for builtAt. */
function readDeployBuiltAtFromEnv(): string | null {
  const buildTime = process.env.BUILD_TIME?.trim();
  if (buildTime) return buildTime;
  const epoch = process.env.SOURCE_DATE_EPOCH?.trim();
  if (epoch && /^\d+$/.test(epoch)) {
    return new Date(parseInt(epoch, 10) * 1000).toISOString();
  }
  return null;
}

const DEPLOY_GIT_SHA =
  readDeployGitShaFromEnv() ?? BUILD_META_FILE.sha;
const DEPLOY_BUILT_AT =
  readDeployBuiltAtFromEnv() ?? BUILD_META_FILE.builtAt;

const app = express();

// CRITICAL: Enable trust proxy for accurate rate limiting behind reverse proxy
app.set('trust proxy', 1);

// CRITICAL: Parse JSON bodies BEFORE defining any routes
app.use(express.json());

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true,
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment requests per hour
  message: "Too many payment requests, please try again later.",
});

const leaderboardUpdateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 username updates per minute
  message: "Too many username update attempts, please slow down.",
});

const sessionPingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many requests",
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Enable gzip compression for API/HTML responses. Skip static assets - they are
// served pre-compressed (Brotli/gzip) by express-static-gzip.
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Skip static assets - express-static-gzip serves pre-compressed .br/.gz
    const reqPath = req.path || req.url?.split('?')[0] || '';
    if (
      reqPath === '/' ||
      reqPath.startsWith('/assets/') ||
      /\.(js|css|html|br|gz|json|xml|svg|ico|png|woff2?)(\?|$)/i.test(reqPath)
    ) {
      return false;
    }
    const contentType = res.getHeader('Content-Type') as string;
    if (contentType && (contentType.includes('audio') || contentType.includes('video'))) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Add caching for static assets (audio, images, icons)
app.use((req, res, next) => {
  // Explicitly handle fonts before any other matching to prevent HTML fallback
  if (req.path.startsWith('/fonts/') && req.path.match(/\.(woff2|ttf|otf)$/)) {
    const fontPath = path.resolve(__dirname, "..", "public", req.path.slice(1));
    if (fs.existsSync(fontPath)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.set('Content-Type', req.path.endsWith('.woff2') ? 'font/woff2' : 'font/woff2');
      return res.sendFile(fontPath);
    }
  }

  // Cache hashed assets from Vite build for 1 year
  if (req.path.startsWith('/assets/')) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache audio files for 1 month
  else if (req.path.startsWith('/sounds/')) {
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
  }
  // Cache icons and images for 1 month
  else if (req.path.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)) {
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
  }
  // Cache fonts for 1 year
  else if (req.path.match(/\.(woff2|ttf|otf)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Content-Type', req.path.endsWith('.woff2') ? 'font/woff2' : 'font/ttf');
  }
  // Cache manifest and robots for 1 day
  else if (req.path.match(/\.(json|txt|xml)$/) && !req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=86400');
  }
  next();
});

// GEO: Serve llms.txt and llms-full.txt explicitly (before SPA fallback)
// Ensures AI crawlers get plain text, not HTML, regardless of static middleware order
const publicDir = fs.existsSync(path.resolve(__dirname, "public", "llms.txt"))
  ? path.resolve(__dirname, "public")
  : path.resolve(__dirname, "..", "client", "public");
["llms.txt", "llms-full.txt"].forEach((file) => {
  app.get(`/${file}`, (req, res) => {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("Cache-Control", "public, max-age=86400");
      res.sendFile(filePath);
    } else {
      res.status(404).send("Not found");
    }
  });
});

app.get("/api/config", (req, res) => {
  const config = getSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    log("⚠️ Supabase config not found in environment variables");
    return res
      .status(500)
      .json({ error: "Supabase configuration not available" });
  }
  // Cache config for 1 hour since it rarely changes
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(config);
});

app.get("/api/version", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json({
    version: APP_PACKAGE_VERSION,
    sha: DEPLOY_GIT_SHA,
    builtAt: DEPLOY_BUILT_AT,
  });
});

// Server-side Supabase admin client (bypasses RLS)
import { createClient } from "@supabase/supabase-js";
import {
  MARKETING_CONSENT_TEXT_VERSION,
  MARKETING_PROMPT_VERSION,
  CLIENT_ALLOWED_MARKETING_SOURCES,
  getMarketingAdminEnv,
  upsertMarketingPreferences,
  hashMarketingToken,
  type MarketingConsentSource,
} from "./marketing";

// Helper function to mask emails
function maskEmail(email: string | null): string {
  if (!email) return "Anonymous";
  const parts = email.split("@");
  if (parts.length !== 2) return "Anonymous";
  const local = parts[0];

  if (local.length <= 4) {
    return `${local.substring(0, 2)}***`;
  }

  return `${local.substring(0, 2)}***${local.substring(local.length - 2)}`;
}

function summarizeResponseBody(body: unknown): string {
  if (body === null || body === undefined) {
    return "body:null";
  }
  if (Array.isArray(body)) {
    return `body:array(len=${body.length})`;
  }
  if (typeof body === "string") {
    return `body:string(len=${body.length})`;
  }
  if (typeof body === "object") {
    const keys = Object.keys(body as Record<string, unknown>);
    const shownKeys = keys.slice(0, 5).join(",");
    const suffix = keys.length > 5 ? ",..." : "";
    return `body:object(keys=${keys.length}${shownKeys ? `:${shownKeys}${suffix}` : ""})`;
  }
  return `body:${typeof body}`;
}

// Cache admin clients to reuse connections
const adminClients = new Map<string, any>();

const getAdminClient = (env: "dev" | "prod" = "dev") => {
  // Return cached client if exists
  if (adminClients.has(env)) {
    return adminClients.get(env);
  }

  const supabaseUrl =
    env === "dev"
      ? process.env.VITE_SUPABASE_URL_DEV
      : process.env.VITE_SUPABASE_URL_PROD;
  const supabaseServiceKey =
    env === "dev"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY_DEV
      : process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      `Supabase admin config not available for ${env} environment`,
    );
  }

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-connection-pool': 'true'
      }
    }
  });

  adminClients.set(env, client);
  return client;
};

async function getSessionUserFromBearer(
  req: Request,
): Promise<{ id: string; email: string | undefined } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const jwt = authHeader.slice(7);
  const config = getSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }
  const anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await anonClient.auth.getUser(jwt);
  if (error || !user?.id || !user.email_confirmed_at) {
    return null;
  }
  return { id: user.id, email: user.email ?? undefined };
}

/** Any valid session user id (e.g. account deletion); does not require confirmed email. */
async function getSessionUserIdFromBearer(
  req: Request,
): Promise<{ id: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const jwt = authHeader.slice(7);
  const config = getSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }
  const anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await anonClient.auth.getUser(jwt);
  if (error || !user?.id) {
    return null;
  }
  return { id: user.id };
}

// Internal gender detection - calls local Python service. Not exposed in public API docs.
// Requires: GENDER_SERVICE_URL (e.g. http://127.0.0.1:5001), GENDER_SERVICE_TOKEN
app.post("/api/gender", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization required" });
    }
    const jwt = authHeader.slice(7);

    const serviceUrl = process.env.GENDER_SERVICE_URL;
    const serviceToken = process.env.GENDER_SERVICE_TOKEN;
    if (!serviceUrl || !serviceToken) {
      const missing = [!serviceUrl && "GENDER_SERVICE_URL", !serviceToken && "GENDER_SERVICE_TOKEN"].filter(Boolean);
      return res.status(503).json({
        error: "Gender service not configured",
        hint: `Set ${missing.join(" and ")} in environment`,
      });
    }

    const config = getSupabaseConfig();
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    const anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser(jwt);
    if (authError || !user?.email_confirmed_at) {
      return res.status(401).json({ error: "Invalid or unconfirmed session" });
    }

    const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
    const email = user.email ?? null;
    if (!name && !email) {
      return res.status(400).json({ error: "No name or email available" });
    }

    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gender-Service-Token": serviceToken,
      },
      body: JSON.stringify({ name: name || undefined, email: email || undefined }),
    });

    if (response.status === 401) {
      return res.status(500).json({
        error: "Gender service auth failed",
        hint: "GENDER_SERVICE_TOKEN must match the Python service",
      });
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return res.status(503).json({
        error: "Gender service unavailable",
        hint: "Check GENDER_SERVICE_URL points to http://127.0.0.1:5001 and the Python service is running",
      });
    }
    const data = await response.json();
    if (data.g) {
      return res.json({ g: data.g, fn: data.fn ?? null });
    }
    if (response.status >= 400) {
      return res.status(response.status >= 500 ? 503 : 400).json({
        error: data.error ?? "Gender service error",
        hint: data.hint ?? data.detail,
      });
    }
    return res.json({ g: null, fn: null });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    const isFetch = msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND");
    return res.status(500).json({
      error: "Gender detection failed",
      hint: isFetch ? "Gender service unreachable - is it running on GENDER_SERVICE_URL?" : msg,
    });
  }
});

// API endpoint to fetch admin dashboard data (server-side, bypasses RLS)
app.get("/api/admin/data", async (req, res) => {
  try {
    // Cache for 5 minutes to reduce repeated fetches
    res.set("Cache-Control", "public, max-age=300");

    const env = (req.query.env as "dev" | "prod") || "dev";
    const adminClient = getAdminClient(env);

    // Calculate date filters
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filterDate = thirtyDaysAgo.toISOString();

    // totalUserCount will be set from auth.users pagination below
    let totalUserCount = 0;

    // Fetch data with 30-day filter for clicks, but 1 year for saves to support chart time ranges
    // Use a high limit to get all results (Supabase default is 1000)
    const QUERY_LIMIT = 10000000;
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoFilter = oneYearAgo.toISOString();

    const [clicksResult, savesResult, purchasesResult, dauResult] = await Promise.all([
      adminClient
        .from("button_clicks")
        .select("*")
        .gte("timestamp", filterDate)
        .order("timestamp", { ascending: false })
        .limit(QUERY_LIMIT),
      adminClient
        .from("game_saves")
        .select("user_id, game_state, updated_at, created_at")
        .or(`created_at.gte.${oneYearAgoFilter},updated_at.gte.${oneYearAgoFilter}`) // Load 1 year of data for both signups and activity
        .order("updated_at", { ascending: false })
        .limit(QUERY_LIMIT),
      adminClient
        .from("purchases")
        .select("*")
        .order("purchased_at", { ascending: false })
        .limit(QUERY_LIMIT),
      adminClient
        .from("daily_active_users")
        .select("date, active_user_count")
        .order("date", { ascending: true })
        .limit(365), // Load 1 year of DAU data
    ]);

    if (clicksResult.error) {
      throw clicksResult.error;
    }
    if (savesResult.error) {
      throw savesResult.error;
    }
    if (purchasesResult.error) {
      throw purchasesResult.error;
    }
    if (dauResult.error) {
      throw dauResult.error;
    }

    // Helper function to calculate email confirmation stats for a time range
    const calculateEmailStats = (users: any[], startDate?: Date) => {
      const filteredUsers = startDate
        ? users.filter((user: any) => new Date(user.created_at) >= startDate)
        : users;

      const confirmedUsers = filteredUsers.filter((user: any) => user.email_confirmed_at);
      const unconfirmedUsers = filteredUsers.length - confirmedUsers.length;

      let totalDelayMinutes = 0;
      let usersWithSignIn = 0;

      confirmedUsers.forEach((user: any) => {
        if (user.last_sign_in_at) {
          usersWithSignIn++;
          const confirmTime = new Date(user.email_confirmed_at);
          const signInTime = new Date(user.last_sign_in_at);
          const delayMs = signInTime.getTime() - confirmTime.getTime();
          totalDelayMinutes += Math.max(0, delayMs / 1000 / 60);
        }
      });

      return {
        totalRegistrations: filteredUsers.length,
        confirmedUsers: confirmedUsers.length,
        unconfirmedUsers,
        totalConfirmationDelay: totalDelayMinutes,
        usersWithSignIn,
      };
    };

    // Fetch email confirmation stats from auth.users
    let emailConfirmationStats = {
      allTime: {
        totalRegistrations: 0,
        confirmedUsers: 0,
        unconfirmedUsers: 0,
        totalConfirmationDelay: 0,
        usersWithSignIn: 0,
      },
      last30Days: {
        totalRegistrations: 0,
        confirmedUsers: 0,
        unconfirmedUsers: 0,
        totalConfirmationDelay: 0,
        usersWithSignIn: 0,
      },
      last7Days: {
        totalRegistrations: 0,
        confirmedUsers: 0,
        unconfirmedUsers: 0,
        totalConfirmationDelay: 0,
        usersWithSignIn: 0,
      },
    };

    let registrationMethodStats = {
      emailRegistrations: 0,
      googleRegistrations: 0,
    };

    let authSignups: Array<{ id: string; created_at: string }> = [];

    try {
      log("📧 Fetching auth users for email and registration stats...");

      // Paginate through all users once and reuse data for all stats
      let allUsers: any[] = [];
      let page = 1;
      const perPage = 1000;

      while (true) {
        const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

        if (authError) {
          log("❌ Error fetching auth users for registration method:", authError);
          break;
        }

        if (!authData || authData.users.length === 0) {
          break;
        }

        allUsers = allUsers.concat(authData.users);

        if (authData.users.length < perPage) {
          break;
        }

        page++;
      }

      log(`📧 Total auth users found: ${allUsers.length}`);
      totalUserCount = allUsers.length;

      // Build auth sign-ups for charts (id + created_at, last 2 years for 1y chart support)
      const twoYearsAgo = new Date(now);
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      authSignups = allUsers
        .filter((u: any) => new Date(u.created_at) >= twoYearsAgo)
        .map((u: any) => ({ id: u.id, created_at: u.created_at }));

      // Calculate email confirmation stats for all three time periods
      emailConfirmationStats.allTime = calculateEmailStats(allUsers);
      emailConfirmationStats.last30Days = calculateEmailStats(allUsers, thirtyDaysAgo);
      emailConfirmationStats.last7Days = calculateEmailStats(allUsers, sevenDaysAgo);

      // Count registration methods
      allUsers.forEach((user: any) => {
        const provider = user.app_metadata?.provider;
        const providers = user.app_metadata?.providers || [];
        const hasGoogleProvider = provider === 'google' || providers.includes('google');

        if (hasGoogleProvider) {
          registrationMethodStats.googleRegistrations++;
        } else {
          registrationMethodStats.emailRegistrations++;
        }
      });
      log("📧 Stats calculated for all time periods and registration methods");
    } catch (error: any) {
      log("❌ Error processing auth-derived stats:", error);
    }

    let marketingMetrics = {
      marketingUsersPrompted: 0,
      marketingUsersOptedIn: 0,
      marketingOptInRate: 0,
    };
    try {
      const { count: prompted, error: promptedErr } = await adminClient
        .from("marketing_preferences")
        .select("*", { count: "exact", head: true });
      if (promptedErr) {
        throw promptedErr;
      }
      const { count: optedIn, error: optedErr } = await adminClient
        .from("marketing_preferences")
        .select("*", { count: "exact", head: true })
        .eq("marketing_opt_in", true);
      if (optedErr) {
        throw optedErr;
      }
      const promptedN = prompted ?? 0;
      const optedN = optedIn ?? 0;
      marketingMetrics = {
        marketingUsersPrompted: promptedN,
        marketingUsersOptedIn: optedN,
        marketingOptInRate:
          promptedN > 0
            ? Math.round((optedN / promptedN) * 10000) / 100
            : 0,
      };
    } catch (mErr: any) {
      log("⚠️ Marketing metrics skipped:", mErr?.message ?? mErr);
    }

    res.json({
      clicks: clicksResult.data,
      saves: savesResult.data,
      purchases: purchasesResult.data,
      dau: dauResult.data,
      totalUserCount: totalUserCount || 0,
      emailConfirmationStats: emailConfirmationStats,
      registrationMethodStats: registrationMethodStats,
      authSignups,
      marketingMetrics,
    });
  } catch (error: any) {
    log("❌ Admin data fetch failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin user lookup endpoint
app.get("/api/admin/user-lookup", async (req, res) => {
  try {
    const adminClient = getAdminClient(
      (req.query.env as "dev" | "prod") || "dev",
    );

    const userId = req.query.userId as string;
    const email = req.query.email as string;

    if (!userId && !email) {
      return res.status(400).json({ error: "userId or email is required" });
    }

    let save;
    let error;

    if (email) {
      // Lookup by email - need to join with auth.users
      const { data: authUser, error: authError } =
        await adminClient.auth.admin.listUsers();

      if (authError) {
        return res
          .status(500)
          .json({ error: "Failed to lookup user by email" });
      }

      const matchingUser = authUser.users.find((u: any) => u.email === email);

      if (!matchingUser) {
        return res.status(404).json({ error: "No user found with this email" });
      }

      const { data: saveData, error: saveError } = await adminClient
        .from("game_saves")
        .select("user_id, game_state, updated_at, created_at")
        .eq("user_id", matchingUser.id)
        .single();

      save = saveData;
      error = saveError;
    } else {
      // Lookup by user ID
      const { data: saveData, error: saveError } = await adminClient
        .from("game_saves")
        .select("user_id, game_state, updated_at, created_at")
        .eq("user_id", userId)
        .single();

      save = saveData;
      error = saveError;
    }

    if (error) {
      if (error.code === "PGRST116") {
        return res.json({ save: null });
      }
      throw error;
    }

    res.json({ save });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let responseSummary: string | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    responseSummary = summarizeResponseBody(bodyJson);
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Session ping is high-frequency keepalive noise in logs.
      if (path === "/api/session/ping") {
        return;
      }

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (responseSummary) {
        logLine += ` :: ${responseSummary}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

import { createServer } from "http";

// Leaderboard endpoints - MUST be before Vite setup
// IMPORTANT: Specific routes (metadata) must come before parameterized routes (:mode)
app.get("/api/leaderboard/metadata", async (req, res) => {
  try {
    const env = (req.query.env as "dev" | "prod") || "prod";
    const adminClient = getAdminClient(env);

    log(`📊 Fetching leaderboard metadata for ${env} environment`);

    const { data, error } = await adminClient
      .from("leaderboard_metadata")
      .select("value")
      .eq("key", "last_updated")
      .maybeSingle();

    if (error) {
      log("❌ Metadata query error:", error);
      throw error;
    }

    log(`📊 Metadata result: hasValue=${!!data?.value}`);

    // If no metadata exists yet, return null
    const result = { lastUpdated: data?.value || null };
    log(`📊 Returning metadata: lastUpdated=${result.lastUpdated ? "set" : "null"}`);

    // Set proper content type and cache appropriately
    res.setHeader('Content-Type', 'application/json');
    if (env === "prod") {
      res.set("Cache-Control", "public, max-age=600"); // 10 minutes in production
    } else {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    }

    res.json(result);
  } catch (error: any) {
    log("❌ Leaderboard metadata fetch failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/leaderboard/:mode", async (req, res) => {
  try {
    const mode = req.params.mode as "normal" | "cruel";
    const cruelMode = mode === "cruel";
    const env = (req.query.env as "dev" | "prod") || "prod";
    const adminClient = getAdminClient(env);

    log(`📊 Fetching ${mode} leaderboard for ${env} environment`);

    const { data, error } = await adminClient
      .from("leaderboard")
      .select("id, username, email, play_time, completed_at")
      .eq("cruel_mode", cruelMode)
      .order("play_time", { ascending: true })
      .limit(50);

    if (error) throw error;

    log(
      `📊 Found ${data?.length || 0} entries for ${mode} mode in ${env}, cruel_mode=${cruelMode}`,
    );

    // Mask emails server-side
    const maskedData = data.map((entry: any) => ({
      id: entry.id,
      username: entry.username,
      displayName: entry.username || maskEmail(entry.email),
      play_time: entry.play_time,
      completed_at: entry.completed_at,
    }));

    // Cache appropriately based on environment
    if (env === "prod") {
      res.set("Cache-Control", "public, max-age=600"); // 10 minutes in production
    } else {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    }
    res.json(maskedData);
  } catch (error: any) {
    log("❌ Leaderboard fetch failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/leaderboard/update-username", leaderboardUpdateLimiter, async (req, res) => {
  try {
    const { userId, username } = req.body;

    if (!userId || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check for profanity
    const filter = new Filter();
    if (filter.isProfane(username)) {
      log(`⚠️ Profane username rejected: "${username}"`);
      return res
        .status(400)
        .json({ error: "Username contains inappropriate language" });
    }

    const env = (req.query.env as "dev" | "prod") || "prod";
    const adminClient = getAdminClient(env);

    log(`📝 Updating username for user ${userId}: "${username}"`);

    // Check if username is already taken by another user
    const { data: existingUser, error: checkError } = await adminClient
      .from("game_saves")
      .select("user_id")
      .eq("username", username)
      .neq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      log("❌ Username check error:", checkError);
      throw checkError;
    }

    if (existingUser) {
      log(`⚠️ Username "${username}" already taken by another user`);
      return res.status(409).json({ error: "Username already taken" });
    }

    // Update username in all leaderboard entries for this user
    const { data, error: leaderboardError } = await adminClient
      .from("leaderboard")
      .update({ username })
      .eq("user_id", userId);

    if (leaderboardError) {
      log("⚠️ Leaderboard update error (non-critical):", leaderboardError);
      // Don't throw - continue to update game_saves
    } else {
      log("✅ Updated username in leaderboard table");
    }

    // Update username in game_saves - simple UPDATE
    const { error: saveError, data: saveData } = await adminClient
      .from("game_saves")
      .update({ username })
      .eq("user_id", userId)
      .select();

    if (saveError) {
      log("❌ Game saves update error:", saveError);
      throw saveError;
    }

    if (saveData && saveData.length > 0) {
      log("✅ Updated username in game_saves table");
    } else {
      log("⚠️ No game save found for user");
    }

    // Trigger leaderboard refresh to pick up the new username
    const { error: refreshError } = await adminClient.rpc(
      "refresh_leaderboard",
    );
    if (refreshError) {
      log("⚠️ Leaderboard refresh error (non-critical):", refreshError);
    } else {
      log("✅ Triggered leaderboard refresh");
    }

    res.json({ success: true });
  } catch (error: any) {
    log("❌ Username update failed:", error);
    res.status(500).json({ error: error.message });
  }
});

(async () => {
  // Start gender service automatically if configured (runs alongside Node server)
  const genderServiceUrl = process.env.GENDER_SERVICE_URL;
  const genderServiceToken = process.env.GENDER_SERVICE_TOKEN;
  if (genderServiceUrl && genderServiceToken) {
    const genderServiceDir = path.join(__dirname, "..", "gender-service");
    const appPy = path.join(genderServiceDir, "app.py");
    const dbPath = path.join(genderServiceDir, "first_names.db");
    const createDbPy = path.join(genderServiceDir, "create_db.py");

    if (fs.existsSync(appPy)) {
      if (!fs.existsSync(dbPath) && fs.existsSync(createDbPy)) {
        const pyCmd = process.platform === "win32" ? "python" : "python3";
        const requirementsPath = path.join(genderServiceDir, "requirements.txt");
        if (fs.existsSync(requirementsPath)) {
          log("Installing gender-service deps (first run)...");
          spawnSync(pyCmd, ["-m", "pip", "install", "-r", "requirements.txt"], {
            cwd: genderServiceDir,
            env: process.env,
            stdio: "pipe",
          });
        }
        log("Creating gender DB (first run)...");
        const create = spawnSync(pyCmd, ["create_db.py"], {
          cwd: genderServiceDir,
          env: process.env,
          stdio: "pipe",
        });
        if (create.status === 0) {
          log("Gender DB created");
        } else {
          log(`Gender DB creation failed: ${create.stderr?.toString() || String(create.error)}`);
        }
      }

      if (fs.existsSync(dbPath)) {
        const pyCmd = process.platform === "win32" ? "python" : "python3";
        const py = spawn(pyCmd, ["app.py"], {
          cwd: genderServiceDir,
          env: {
            ...process.env,
            GENDER_SERVICE_TOKEN: genderServiceToken,
          },
          detached: true,
          stdio: "ignore",
        });
        py.unref();
        log("Gender service started");
      } else {
        log("Gender service skipped: create_db.py failed or DB missing");
      }
    }
  }

  const server = createServer(app);

  // CRITICAL: All API routes MUST be defined before Vite middleware
  app.get("/api/marketing/preferences", async (req, res) => {
    try {
      const user = await getSessionUserFromBearer(req);
      if (!user) {
        return res.status(401).json({ error: "Authorization required" });
      }
      const env = getMarketingAdminEnv();
      const adminClient = getAdminClient(env);
      const { data, error } = await adminClient
        .from("marketing_preferences")
        .select("marketing_opt_in, consent_source, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return res.json({
        marketing_opt_in: data?.marketing_opt_in === true,
        has_preference_record: !!data,
        consent_source: data?.consent_source ?? null,
        updated_at: data?.updated_at ?? null,
      });
    } catch (err: any) {
      log("❌ GET /api/marketing/preferences failed:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Failed to load preferences" });
    }
  });

  app.post("/api/marketing/preferences", async (req, res) => {
    try {
      const user = await getSessionUserFromBearer(req);
      if (!user) {
        return res.status(401).json({ error: "Authorization required" });
      }
      const body = req.body ?? {};
      const marketingOptIn = body.marketing_opt_in === true;
      const consentSource = body.consent_source as string | undefined;
      if (
        !consentSource ||
        !CLIENT_ALLOWED_MARKETING_SOURCES.has(
          consentSource as MarketingConsentSource,
        )
      ) {
        return res
          .status(400)
          .json({ error: "Invalid or missing consent_source" });
      }
      const consentTextVersion =
        typeof body.consent_text_version === "number"
          ? body.consent_text_version
          : MARKETING_CONSENT_TEXT_VERSION;
      const promptVersion =
        typeof body.prompt_version === "number"
          ? body.prompt_version
          : MARKETING_PROMPT_VERSION;

      const env = getMarketingAdminEnv();
      const adminClient = getAdminClient(env);
      await upsertMarketingPreferences(
        adminClient,
        user.id,
        typeof body.email === "string" ? body.email : user.email,
        marketingOptIn,
        consentSource as MarketingConsentSource,
        consentTextVersion,
        promptVersion,
      );
      return res.json({ ok: true });
    } catch (err: any) {
      log("❌ POST /api/marketing/preferences failed:", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Failed to save preferences" });
    }
  });

  app.post("/api/marketing/unsubscribe", async (req, res) => {
    try {
      const token =
        typeof req.body?.token === "string" ? req.body.token.trim() : "";
      if (!token) {
        return res
          .status(400)
          .json({ error: "token required", status: "invalid" });
      }
      const tokenHash = hashMarketingToken(token);
      const env = getMarketingAdminEnv();
      const adminClient = getAdminClient(env);

      const { data: row, error: findError } = await adminClient
        .from("marketing_unsubscribe_tokens")
        .select("id, user_id, expires_at, used_at")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (findError) {
        throw findError;
      }
      if (!row) {
        return res.json({
          ok: false,
          status: "invalid",
          message:
            "This unsubscribe link is invalid or has already been used.",
        });
      }
      if (row.used_at) {
        return res.json({
          ok: false,
          status: "used",
          message: "This unsubscribe link was already used.",
        });
      }
      const exp = new Date(row.expires_at).getTime();
      if (Number.isFinite(exp) && Date.now() > exp) {
        return res.json({
          ok: false,
          status: "expired",
          message: "This unsubscribe link has expired.",
        });
      }

      const nowIso = new Date().toISOString();
      const { error: useErr } = await adminClient
        .from("marketing_unsubscribe_tokens")
        .update({ used_at: nowIso })
        .eq("id", row.id)
        .is("used_at", null);
      if (useErr) {
        throw useErr;
      }

      await upsertMarketingPreferences(
        adminClient,
        row.user_id,
        undefined,
        false,
        "unsubscribe_link",
        MARKETING_CONSENT_TEXT_VERSION,
        MARKETING_PROMPT_VERSION,
      );

      return res.json({
        ok: true,
        status: "unsubscribed",
        message: "You've been unsubscribed from marketing emails.",
      });
    } catch (err: any) {
      log("❌ POST /api/marketing/unsubscribe failed:", err);
      return res.status(500).json({
        error: err?.message ?? "Unsubscribe failed",
        status: "error",
      });
    }
  });

  app.post("/api/account/delete", authLimiter, async (req, res) => {
    try {
      const user = await getSessionUserIdFromBearer(req);
      if (!user) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const env = getMarketingAdminEnv();
      const adminClient = getAdminClient(env);

      const { error: anonError } = await adminClient
        .from("game_saves")
        .update({ user_id: null, username: null })
        .eq("user_id", user.id);
      if (anonError) {
        throw anonError;
      }

      const { error: delError } = await adminClient.auth.admin.deleteUser(
        user.id,
      );
      if (delError) {
        throw delError;
      }

      return res.json({ ok: true });
    } catch (err: any) {
      log("❌ POST /api/account/delete failed:", err);
      return res.status(500).json({
        error: err?.message ?? "Account deletion failed",
      });
    }
  });

  // Referral endpoint
  app.post("/api/referral/process", authLimiter, async (req, res) => {
    try {
      const { newUserId, referralCode } = req.body || {};

      if (!newUserId || !referralCode) {
        return res.status(400).json({
          error: "Missing required parameters",
          received: { newUserId: !!newUserId, referralCode: !!referralCode },
        });
      }

      const result = await processReferral(newUserId, referralCode);

      // Ensure we send JSON with correct content-type
      res.setHeader("Content-Type", "application/json");
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payment endpoints
  app.post('/api/payment/create-intent', paymentLimiter, async (req, res) => {
    try {
      const {
        itemId,
        userEmail,
        userId,
        currency,
        tradersGratitudeDiscount,
        cruelMode,
        playlightFirstPurchaseDiscount,
      } = req.body;
      const { clientSecret, item } = await createPaymentIntent(
        itemId,
        userEmail,
        userId,
        undefined,
        currency,
        tradersGratitudeDiscount === true ? true : undefined,
        cruelMode === true ? true : cruelMode === false ? false : undefined,
        playlightFirstPurchaseDiscount === true ? true : undefined
      );

      res.json({ clientSecret, item });
    } catch (error: any) {
      console.error('Payment intent creation failed:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/payment/verify", paymentLimiter, async (req, res) => {
    try {
      const { paymentIntentId, userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      // Get supabase admin client
      const env = process.env.NODE_ENV === "production" ? "prod" : "dev";
      const adminClient = getAdminClient(env);

      // Verify payment and create all purchases (bundle + components)
      const result = await verifyPayment(paymentIntentId, userId, adminClient);

      res.json(result);
    } catch (error: any) {
      log("❌ Payment verification error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Anonymous session duration tracking (no auth, no personal data)
  app.post("/api/session/ping", sessionPingLimiter, async (req, res) => {
    try {
      const { sid, dur } = req.body;
      if (!sid || typeof sid !== "string" || sid.length > 64) {
        return res.status(400).json({ error: "Invalid session" });
      }
      const durationSeconds = Math.max(0, Math.min(86400, Math.floor(Number(dur) || 0)));

      const env = process.env.NODE_ENV === "production" ? "prod" : "dev";
      const adminClient = getAdminClient(env);

      await adminClient.rpc("upsert_session_ping", {
        p_session_id: sid,
        p_duration: durationSeconds,
      });

      res.status(204).end();
    } catch {
      res.status(500).end();
    }
  });

  // Add endpoint to fetch daily_active_users data from Supabase
  app.get("/api/admin/dau", async (req, res) => {
    try {
      const env = (req.query.env as "dev" | "prod") || "dev";
      const adminClient = getAdminClient(env);

      // Log here, not in the other endpoint
      log(`📊 Fetching DAU data for ${env} environment`);

      const { data: dauData, error: dauError } = await adminClient
        .from('daily_active_users')
        .select('date, active_user_count')
        .order('date', { ascending: false })
        .limit(365); // Get last year of data

      if (dauError) {
        log('❌ Error fetching DAU data:', dauError);
        return res.status(500).json({ error: 'Failed to fetch DAU data' });
      }

      // Compute DAU/WAU/MAU and signup aggregates via DB functions to avoid the PostgREST max_rows cap
      const [
        { data: dauRpc, error: dauRpcError },
        { data: wauData, error: wauError },
        { data: mauData, error: mauError },
        { data: dailySignupsData, error: dailySignupsError },
        { data: hourlySignupsData, error: hourlySignupsError },
      ] = await Promise.all([
        adminClient.rpc('get_daily_active_users'),
        adminClient.rpc('get_weekly_active_users'),
        adminClient.rpc('get_monthly_active_users'),
        adminClient.rpc('get_daily_signups', { days_back: 365 }),
        adminClient.rpc('get_hourly_signups'),
      ]);

      if (dauRpcError) log('❌ Error fetching DAU:', dauRpcError);
      if (wauError) log('❌ Error fetching WAU:', wauError);
      if (mauError) log('❌ Error fetching MAU:', mauError);
      if (dailySignupsError) log('❌ Error fetching daily signups:', dailySignupsError);
      if (hourlySignupsError) log('❌ Error fetching hourly signups:', hourlySignupsError);

      const currentDau: number = typeof dauRpc === 'number' ? dauRpc : 0;
      const currentWau: number = typeof wauData === 'number' ? wauData : 0;
      const currentMau: number = typeof mauData === 'number' ? mauData : 0;

      log(`📊 DAU: ${currentDau}, WAU: ${currentWau}, MAU: ${currentMau}`);

      res.json({
        dau: dauData || [],
        currentDau: currentDau,
        currentWau: currentWau,
        currentMau: currentMau,
        dailySignups: dailySignupsData || [],
        hourlySignups: hourlySignupsData || [],
      });
    } catch (error: any) {
      log('❌ Error in /api/admin/dau:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Session duration stats for admin dashboard
  app.get("/api/admin/sessions", async (req, res) => {
    try {
      const env = (req.query.env as "dev" | "prod") || "dev";
      const daysBack = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 90));
      const adminClient = getAdminClient(env);

      const { data, error } = await adminClient.rpc("get_session_duration_stats", { days_back: daysBack });

      if (error) {
        log("❌ Session stats error:", error);
        return res.status(500).json({ error: error.message });
      }

      res.set("Cache-Control", "public, max-age=300");
      res.json(data || []);
    } catch (error: any) {
      log("❌ Session stats failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Setup Vite middleware AFTER all API routes to prevent catch-all interference
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error handler - MUST be after all routes
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();