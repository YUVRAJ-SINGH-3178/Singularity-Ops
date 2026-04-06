require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const Sentry = require("@sentry/node");
const { rateLimit } = require("express-rate-limit");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { startTaskDeadlineWatcher } = require("./services/taskDeadlineService");

const sentryDsn = process.env.SENTRY_DSN;
const sentryEnabled = Boolean(sentryDsn);
const enforceHttps =
  process.env.ENFORCE_HTTPS === "true" || process.env.NODE_ENV === "production";

Sentry.init({
  dsn: sentryDsn,
  enabled: sentryEnabled,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  if (sentryEnabled) {
    Sentry.captureException(
      reason instanceof Error ? reason : new Error(String(reason)),
    );
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  if (sentryEnabled) {
    Sentry.captureException(error);
  }
});

// ─── Import routes ──────────────────────────────────────────────────────────
const commitmentRoutes = require("./routes/commitment");
const proofRoutes = require("./routes/proof");
const voteRoutes = require("./routes/vote");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const taskRoutes = require("./routes/task");
const authRoutes = require("./routes/auth");

// ─── Initialize app ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const DB_RECONNECT_DELAY_MS = Number(process.env.DB_RECONNECT_DELAY_MS || 5000);

let dbConnectInProgress = false;

function getDatabaseState() {
  const stateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const readyState = mongoose.connection.readyState;
  return {
    readyState,
    state: stateMap[readyState] || "unknown",
    connected: readyState === 1,
  };
}

async function connectDbWithRetryLoop() {
  if (dbConnectInProgress || mongoose.connection.readyState === 1) {
    return;
  }

  dbConnectInProgress = true;
  try {
    await connectDB();
  } catch (error) {
    console.error(
      `⚠️  DB connect failed. Retrying in ${DB_RECONNECT_DELAY_MS}ms: ${error.message}`,
    );
    setTimeout(() => {
      connectDbWithRetryLoop().catch((retryError) => {
        console.error("Unexpected DB retry error:", retryError.message);
      });
    }, DB_RECONNECT_DELAY_MS);
  } finally {
    dbConnectInProgress = false;
  }
}

// ─── Rate limiters ──────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => {
    // Read-heavy endpoints refresh frequently in the UI; keep limits focused on writes.
    if (req.method === "GET") return true;
    return false;
  },
  message: { success: false, error: "Too many requests. Try again later." },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // 20 writes per 15 min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many submissions. Slow down." },
});

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30, // 30 votes per 15 min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many votes. Try again later." },
});

function createApp() {
  const app = express();
  if (enforceHttps) {
    app.set("trust proxy", 1);
  }

  // ─── Middleware ────────────────────────────────────────────────────────────
  const corsOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors(
      corsOrigins.length > 0
        ? {
            origin: corsOrigins,
            methods: ["GET", "POST", "DELETE", "OPTIONS"],
          }
        : undefined,
    ),
  );
  app.use(helmet());

  app.use((req, res, next) => {
    if (!enforceHttps) {
      return next();
    }

    const forwardedProto = req.header("x-forwarded-proto") || "";
    const isSecure =
      req.secure || forwardedProto.split(",")[0].trim() === "https";
    if (isSecure) {
      return next();
    }

    if (req.method === "GET" || req.method === "HEAD") {
      const host = req.header("host");
      if (host) {
        return res.redirect(308, `https://${host}${req.originalUrl}`);
      }
    }

    return res.status(426).json({
      success: false,
      error: "HTTPS is required for this API",
    });
  });

  app.use(globalLimiter);
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));
  app.use(morgan("dev"));

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.use("/api/auth", authRoutes); // Nonce/signature auth
  app.use("/api/commitment", writeLimiter, commitmentRoutes); // POST /api/commitment
  app.use("/api/commitments", commitmentRoutes); // GET  /api/commitments/:walletAddress
  app.use("/api/proof", writeLimiter, proofRoutes); // POST /api/proof/:commitmentId
  app.use("/api/proofs", proofRoutes); // GET  /api/proofs/feed
  app.use("/api/vote", voteLimiter, voteRoutes); // POST /api/vote/:proofId
  app.use("/api/user", userRoutes); // GET/DELETE /api/user/:wallet
  app.use("/api/admin", writeLimiter, adminRoutes); // GET/POST admin pool operations
  app.use("/api/tasks", taskRoutes); // Enterprise task workflow

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => {
    const database = getDatabaseState();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database,
    });
  });

  // Useful for platform health checks that hit the root path.
  app.get("/", (req, res) => {
    res.status(200).send("DDAT backend is running");
  });

  // ─── 404 handler ──────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  if (sentryEnabled) {
    Sentry.setupExpressErrorHandler(app);
  }

  // ─── Global error handler ─────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    if (sentryEnabled) {
      Sentry.captureException(err);
    }
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  });

  return app;
}

// ─── Start server ───────────────────────────────────────────────────────────
const startServer = async () => {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`\n🚀 DDAT Backend running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
  });

  // Start DB connection after the port is bound so hosting platforms
  // can complete startup health checks while DB warms up.
  await connectDbWithRetryLoop();
  startTaskDeadlineWatcher();
};

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
