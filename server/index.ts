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

// Server-side Supabase admin client (bypasses RLS)
import { createClient } from "@supabase/supabase-js";

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

    try {
      log("📧 Fetching auth users for email confirmation stats...");

      // Paginate through all users
      let allUsers: any[] = [];
      let page = 1;
      const perPage = 1000; // Max per page

      while (true) {
        const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

        if (authError) {
          log("❌ Error fetching auth users:", authError);
          break;
        }

        if (!authData || authData.users.length === 0) {
          break;
        }

        allUsers = allUsers.concat(authData.users);

        // If we got fewer users than perPage, we've reached the end
        if (authData.users.length < perPage) {
          break;
        }

        page++;
      }

      log("📧 Total auth users found:", allUsers.length);
      totalUserCount = allUsers.length;

      // Calculate stats for all three time periods
      emailConfirmationStats.allTime = calculateEmailStats(allUsers);
      emailConfirmationStats.last30Days = calculateEmailStats(allUsers, thirtyDaysAgo);
      emailConfirmationStats.last7Days = calculateEmailStats(allUsers, sevenDaysAgo);

      log("📧 Stats calculated for all time periods");
    } catch (error: any) {
      log("❌ Error processing email confirmation stats:", error);
    }

    // Calculate registration method stats
    let registrationMethodStats = {
      emailRegistrations: 0,
      googleRegistrations: 0,
    };

    try {
      // Paginate through all users again for registration method
      let allUsersForMethod: any[] = [];
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

        allUsersForMethod = allUsersForMethod.concat(authData.users);

        if (authData.users.length < perPage) {
          break;
        }

        page++;
      }

      // Count registration methods
      allUsersForMethod.forEach((user: any) => {
        const provider = user.app_metadata?.provider;
        const providers = user.app_metadata?.providers || [];
        const hasGoogleProvider = provider === 'google' || providers.includes('google');

        if (hasGoogleProvider) {
          registrationMethodStats.googleRegistrations++;
        } else {
          registrationMethodStats.emailRegistrations++;
        }
      });
    } catch (error: any) {
      log("❌ Error calculating registration method stats:", error);
    }

    res.json({
      clicks: clicksResult.data,
      saves: savesResult.data,
      purchases: purchasesResult.data,
      dau: dauResult.data,
      totalUserCount: totalUserCount || 0,
      emailConfirmationStats: emailConfirmationStats,
      registrationMethodStats: registrationMethodStats,
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

      const matchingUser = authUser.users.find((u) => u.email === email);

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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
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

    log(`📊 Metadata result:`, { data, hasValue: !!data?.value });

    // If no metadata exists yet, return null
    const result = { lastUpdated: data?.value || null };
    log(`📊 Returning metadata:`, result);

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
    const maskedData = data.map((entry) => ({
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
          log("Gender DB creation failed:", create.stderr?.toString() || create.error);
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
      const { itemId, userEmail, userId, currency, tradersGratitudeDiscount } = req.body;
      const { clientSecret, item } = await createPaymentIntent(
        itemId,
        userEmail,
        userId,
        undefined,
        currency,
        tradersGratitudeDiscount === true ? true : undefined
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

      // Calculate real-time DAU (last 24 hours) using same logic as cron job
      const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

      const { data: recentActivity, error: activityError } = await adminClient
        .from('game_saves')
        .select('user_id', { count: 'exact', head: false })
        .gte('updated_at', `${today}T00:00:00.000Z`)
        .lt('updated_at', `${today}T23:59:59.999Z`);

      if (activityError) {
        log('❌ Error fetching recent activity:', activityError);
      }

      // Count unique users (same as cron job: COUNT(DISTINCT user_id))
      const currentDau = recentActivity
        ? new Set(recentActivity.map(save => save.user_id)).size
        : 0;

      log(`📊 Current DAU (today ${today}): ${currentDau} unique users`);

      res.json({
        dau: dauData || [],
        currentDau: currentDau
      });
    } catch (error: any) {
      log('❌ Error in /api/admin/dau:', error);
      res.status(500).json({ error: 'Internal server error' });
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