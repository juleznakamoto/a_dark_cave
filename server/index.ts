import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { setupVite, serveStatic, log } from "./vite";
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

// CRITICAL: Parse JSON bodies BEFORE defining any routes
app.use(express.json());

// Enable gzip compression for all responses with optimized settings
app.use(compression({
  level: 6, // Balance between speed and compression ratio
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Add caching for static assets (audio, images, icons)
app.use((req, res, next) => {
  // Cache audio files for 1 week
  if (req.path.startsWith('/sounds/')) {
    res.set('Cache-Control', 'public, max-age=604800, immutable');
  }
  // Cache icons and images for 1 week
  else if (req.path.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)) {
    res.set('Cache-Control', 'public, max-age=604800, immutable');
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

// API endpoint to fetch admin dashboard data (server-side, bypasses RLS)
app.get("/api/admin/data", async (req, res) => {
  try {
    // Cache for 5 minutes to reduce repeated fetches
    res.set("Cache-Control", "public, max-age=300");

    const env = (req.query.env as "dev" | "prod") || "dev";
    const adminClient = getAdminClient(env);

    // Calculate date 30 days ago for filtering
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filterDate = thirtyDaysAgo.toISOString();

    // Get total user count from game_saves table (all time)
    const { count: totalUserCount, error: countError } = await adminClient
      .from("game_saves")
      .select("user_id", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    // Fetch data with 30-day filter for saves and clicks
    // Use a high limit to get all results (Supabase default is 1000)
    const QUERY_LIMIT = 50000;

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
        .gte("updated_at", filterDate)
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
        .limit(30),
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

    // Fetch email confirmation stats from auth.users
    let emailConfirmationStats = {
      totalRegistrations: 0,
      registeredAndSignedIn: 0,
      confirmedUsers: 0,
      unconfirmedUsers: 0,
      totalConfirmationDelay: 0,
      usersWithSignIn: 0,
    };

    try {
      log("📧 Fetching auth users for email confirmation stats...");
      const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
      
      if (authError) {
        log("❌ Error fetching auth users:", authError);
      } else {
        log("📧 Total auth users found:", authData.users.length);
        
        const filterDateObj = new Date(filterDate);
        log("📧 Filter date:", filterDate);
        
        const usersInRange = authData.users.filter((user: any) => {
          const createdAt = new Date(user.created_at);
          return createdAt >= filterDateObj;
        });
        
        log("📧 Users in range (last 30 days):", usersInRange.length);

        emailConfirmationStats.totalRegistrations = usersInRange.length;
        
        // Count confirmed users
        const confirmedUsers = usersInRange.filter((user: any) => user.email_confirmed_at);
        emailConfirmationStats.confirmedUsers = confirmedUsers.length;
        emailConfirmationStats.unconfirmedUsers = usersInRange.length - confirmedUsers.length;
        
        log("📧 Confirmed users:", confirmedUsers.length);
        log("📧 Unconfirmed users:", emailConfirmationStats.unconfirmedUsers);

        // Count users who signed in after confirmation and calculate avg time
        let totalDelayMinutes = 0;
        let usersWithSignIn = 0;

        confirmedUsers.forEach((user: any) => {
          if (user.last_sign_in_at) {
            usersWithSignIn++;
            const confirmTime = new Date(user.email_confirmed_at);
            const signInTime = new Date(user.last_sign_in_at);
            const delayMs = signInTime.getTime() - confirmTime.getTime();
            totalDelayMinutes += Math.max(0, delayMs / 1000 / 60); // Convert to minutes
          }
        });

        emailConfirmationStats.totalConfirmationDelay = totalDelayMinutes;
        emailConfirmationStats.usersWithSignIn = usersWithSignIn;
        
        log("📧 Users with sign-in:", usersWithSignIn);
        log("📧 Total confirmation delay (minutes):", totalDelayMinutes);
        log("📧 Final stats:", emailConfirmationStats);
      }
    } catch (error: any) {
      log("❌ Error processing email confirmation stats:", error);
    }

    res.json({
      clicks: clicksResult.data,
      saves: savesResult.data,
      purchases: purchasesResult.data,
      dau: dauResult.data,
      totalUserCount: totalUserCount || 0,
      emailConfirmationStats: emailConfirmationStats,
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

app.post("/api/leaderboard/update-username", async (req, res) => {
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
  const server = createServer(app);

  // CRITICAL: All API routes MUST be defined before Vite middleware
  // Referral endpoint
  app.post("/api/referral/process", async (req, res) => {
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
  app.post('/api/payment/create-intent', async (req, res) => {
    try {
      const { itemId, userEmail, userId, currency } = req.body;
      // Never accept price from client - always use server-side price
      const { clientSecret, item } = await createPaymentIntent(itemId, userEmail, userId, undefined, currency);

      res.json({ clientSecret, item });
    } catch (error: any) {
      console.error('Payment intent creation failed:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/payment/verify", async (req, res) => {
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

  // Setup Vite middleware AFTER all API routes to prevent catch-all interference
  if (app.get("env") === "development") {
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