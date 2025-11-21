import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { createPaymentIntent, verifyPayment, createCheckoutSession, verifyCheckoutSession } from "./stripe";

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

// API endpoint to provide Supabase config to client in production
app.get('/api/config', (req, res) => {
  const config = getSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    log('⚠️ Supabase config not found in environment variables');
    return res.status(500).json({ error: 'Supabase configuration not available' });
  }
  res.json(config);
});
app.use(express.json());

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

  // Payment endpoints - MUST be defined before Vite middleware
  app.post("/api/payment/create-intent", async (req, res) => {
    try {
      const { itemId } = req.body;
      // Never accept price from client - always use server-side price
      const result = await createPaymentIntent(itemId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      const result = await verifyPayment(paymentIntentId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/payment/create-checkout-session", async (req, res) => {
    console.log('📍 Checkpoint session endpoint hit');
    console.log('📍 Headers:', req.headers);
    console.log('📍 Body:', req.body);
    
    try {
      const { itemId } = req.body;
      
      if (!itemId) {
        console.log('❌ No itemId provided');
        return res.status(400).json({ error: 'Item ID is required' });
      }
      
      console.log('✅ Creating checkout session for itemId:', itemId);
      const result = await createCheckoutSession(itemId);
      
      if (!result || !result.url) {
        console.log('❌ No URL in result:', result);
        return res.status(500).json({ error: 'Failed to create checkout session' });
      }
      
      console.log('✅ Checkout session created successfully:', result.url);
      res.setHeader('Content-Type', 'application/json');
      res.json(result);
    } catch (error: any) {
      console.error('❌ Error creating checkout session:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post("/api/payment/verify-checkout-session", async (req, res) => {
    try {
      const { sessionId } = req.body;
      const result = await verifyCheckoutSession(sessionId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
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