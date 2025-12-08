import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { setupVite, serveStatic, log } from "./vite";
import { createPaymentIntent, verifyPayment } from "./stripe";
import { processReferral } from "./referral";

// Supabase config endpoint for production
const getSupabaseConfig = () => {
  const isDev = process.env.NODE_ENV === 'development';
  return {
    supabaseUrl: isDev
      ? process.env.VITE_SUPABASE_URL_DEV
      : process.env.VITE_SUPABASE_URL_PROD,
    supabaseAnonKey: isDev
      ? process.env.VITE_SUPABASE_ANON_KEY_DEV
      : process.env.VITE_SUPABASE_ANON_KEY_PROD
  };
};

const app = express();

// Enable gzip compression for all responses
app.use(compression());

// API endpoint to provide Supabase config to client in production
// CRITICAL: Parse JSON bodies BEFORE defining any routes
app.use(express.json());

app.get('/api/config', (req, res) => {
  const config = getSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    log('⚠️ Supabase config not found in environment variables');
    return res.status(500).json({ error: 'Supabase configuration not available' });
  }
  res.json(config);
});

// Server-side Supabase admin client (bypasses RLS)
import { createClient } from '@supabase/supabase-js';

const getAdminClient = (env: 'dev' | 'prod' = 'dev') => {
  const supabaseUrl = env === 'dev'
    ? process.env.VITE_SUPABASE_URL_DEV
    : process.env.VITE_SUPABASE_URL_PROD;
  const supabaseServiceKey = env === 'dev'
    ? process.env.SUPABASE_SERVICE_ROLE_KEY_DEV
    : process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(`Supabase admin config not available for ${env} environment`);
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// API endpoint to fetch admin dashboard data (server-side, bypasses RLS)
app.get('/api/admin/data', async (req, res) => {
  try {
    // Cache for 5 minutes to reduce repeated fetches
    res.set('Cache-Control', 'public, max-age=300');

    const env = req.query.env as 'dev' | 'prod' || 'dev';
    log(`📊 Admin data request received with env parameter: '${req.query.env}' (using: ${env})`);
    const adminClient = getAdminClient(env);

    log(`📊 Fetching admin dashboard data from ${env.toUpperCase()} environment...`);

    // Calculate date 30 days ago for filtering
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filterDate = thirtyDaysAgo.toISOString();

    // Get total user count from game_saves table (all time)
    const { count: totalUserCount, error: countError } = await adminClient
      .from('game_saves')
      .select('user_id', { count: 'exact', head: true });

    if (countError) {
      log('❌ Error counting total users:', countError);
      throw countError;
    }
    log(`✅ Total user count: ${totalUserCount}`);

    // Fetch data with 30-day filter for saves and clicks
    log(`📊 Querying game_saves with filter: updated_at >= ${filterDate}`);
    
    const [clicksResult, savesResult, purchasesResult] = await Promise.all([
      adminClient
        .from('button_clicks')
        .select('*')
        .gte('timestamp', filterDate)
        .order('timestamp', { ascending: false })
        ,
      adminClient
        .from('game_saves')
        .select('user_id, game_state, updated_at, created_at')
        .gte('updated_at', { ascending: false })
        ,
      adminClient
        .from('purchases')
        .select('*')
        .order('purchased_at', { ascending: false })

    ]);
    
    log(`📊 Query complete. Checking results...`);

    if (clicksResult.error) {
      log('❌ Error fetching button_clicks:', clicksResult.error);
      throw clicksResult.error;
    }
    if (savesResult.error) {
      log('❌ Error fetching game_saves:', savesResult.error);
      throw savesResult.error;
    }
    if (purchasesResult.error) {
      log('❌ Error fetching purchases:', purchasesResult.error);
      throw purchasesResult.error;
    }

    log(`✅ Fetched ${clicksResult.data.length} click records (last 30 days)`);
    log(`✅ Fetched ${savesResult.data.length} game saves (active in last 30 days)`);
    log(`✅ Fetched ${purchasesResult.data.length} purchases`);
    
    // Log sample created_at and updated_at timestamps to debug hourly signups
    if (savesResult.data.length > 0) {     
      log(`📊 Recent signups (last 24h): ${recentSaves.length} total`);
      if (recentSaves.length > 0) {
        log(`📊 Sample created_at and updated_at timestamps (newest first):`);
        recentSaves.forEach((save, idx) => {
          log(`   ${idx + 1}. created: ${save.created_at} | updated: ${save.updated_at}`);
        });
      }
      
      // Also log the date range of all saves by created_at and updated_at
      const allCreatedDates = savesResult.data.map(s => new Date(s.created_at).getTime());
      const allUpdatedDates = savesResult.data.map(s => new Date(s.updated_at).getTime());
      const oldestCreated = new Date(Math.min(...allCreatedDates));
      const newestCreated = new Date(Math.max(...allCreatedDates));
      const oldestUpdated = new Date(Math.min(...allUpdatedDates));
      const newestUpdated = new Date(Math.max(...allUpdatedDates));
      log(`📊 Created_at range: ${oldestCreated.toISOString()} to ${newestCreated.toISOString()}`);
      log(`📊 Updated_at range: ${oldestUpdated.toISOString()} to ${newestUpdated.toISOString()}`);
    }

    res.json({
      clicks: clicksResult.data,
      saves: savesResult.data,
      purchases: purchasesResult.data,
      totalUserCount
    });
  } catch (error: any) {
    log('❌ Admin data fetch failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin user lookup endpoint
app.get("/api/admin/user-lookup", async (req, res) => {
  try {
    const adminClient = getAdminClient(req.query.env as 'dev' | 'prod' || 'dev');

    const userId = req.query.userId as string;
    const email = req.query.email as string;
    const env = req.query.env as 'dev' | 'prod' || 'dev';

    if (!userId && !email) {
      return res.status(400).json({ error: "userId or email is required" });
    }

    const tableName = env === "dev" ? "game_saves_dev" : "game_saves";

    let save;
    let error;

    if (email) {
      // Lookup by email - need to join with auth.users
      const { data: authUser, error: authError } = await adminClient.auth.admin.listUsers();

      if (authError) {
        log('❌ Failed to fetch auth users:', authError);
        return res.status(500).json({ error: "Failed to lookup user by email" });
      }

      const matchingUser = authUser.users.find(u => u.email === email);

      if (!matchingUser) {
        return res.status(404).json({ error: "No user found with this email" });
      }

      const { data: saveData, error: saveError } = await adminClient
        .from(tableName)
        .select('user_id, game_state, updated_at, created_at')
        .eq("user_id", matchingUser.id)
        .single();

      save = saveData;
      error = saveError;
    } else {
      // Lookup by user ID
      const { data: saveData, error: saveError } = await adminClient
        .from(tableName)
        .select('user_id, game_state, updated_at, created_at')
        .eq("user_id", userId)
        .single();

      save = saveData;
      error = saveError;
    }

    if (error) {
      if (error.code === 'PGRST116') {
        log(`⚠️ No save found for user ${email || userId}`);
        return res.json({ save: null });
      }
      log('❌ Error fetching user save:', error);
      throw error;
    }

    log(`✅ Found save for user ${email || userId}`);
    res.json({ save });
  } catch (error: any) {
    log('❌ User lookup failed:', error);
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

(async () => {
  const server = createServer(app);

  // CRITICAL: All API routes MUST be defined before Vite middleware
  // Referral endpoint
  app.post("/api/referral/process", async (req, res) => {
    try {
      const { newUserId, referralCode } = req.body || {};

      if (!newUserId || !referralCode) {
        return res.status(400).json({ 
          error: 'Missing required parameters',
          received: { newUserId: !!newUserId, referralCode: !!referralCode }
        });
      }

      const result = await processReferral(newUserId, referralCode);

      // Ensure we send JSON with correct content-type
      res.setHeader('Content-Type', 'application/json');
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payment endpoints
  app.post("/api/payment/create-intent", async (req, res) => {
    try {
      const { itemId, userEmail, userId } = req.body;
      // Never accept price from client - always use server-side price
      const result = await createPaymentIntent(itemId, userEmail, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { paymentIntentId, userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Get supabase admin client
      const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
      const adminClient = getAdminClient(env);

      // Verify payment and create all purchases (bundle + components)
      const result = await verifyPayment(paymentIntentId, userId, adminClient);

      res.json(result);
    } catch (error: any) {
      log('❌ Payment verification error:', error);
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