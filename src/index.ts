import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import logger from "./config/logger";
import prisma from "./config/database";
import { swaggerSpec } from "./swagger/swagger.config";
import { errorHandler, notFound } from "./middleware/errorHandler";

// Routes
import authRouter from "./routes/auth.routes";
import productRouter from "./routes/product.routes";
import salesRouter from "./routes/sales.routes";
import { analyticsRouter, economicRouter, alertsRouter, categoriesRouter } from "./routes/other.routes";

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ─── Body Parsing & Logging ───────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined", {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      message: "BIZTerimbere API is running",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: "connected",
      environment: process.env.NODE_ENV || "development",
    });
  } catch {
    res.status(503).json({ success: false, message: "Database connection failed" });
  }
});

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "BIZTerimbere API Docs",
    customCss: `
      .swagger-ui .topbar { background-color: #1a56db; }
      .swagger-ui .topbar-wrapper img { display: none; }
      .swagger-ui .topbar-wrapper::before { 
        content: "🏪 BIZTerimbere API"; 
        color: white; font-size: 1.5rem; font-weight: bold; 
      }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: 1,
    },
  })
);

app.get("/api/docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/sales", salesRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/economic", economicRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/categories", categoriesRouter);

// ─── 404 & Error Handlers ────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server (local dev only) ───────────────────────────────────────────
// Vercel runs as serverless — no listen() needed
if (process.env.NODE_ENV !== "production" && require.main === module) {
  const PORT = process.env.PORT || 5000;
  const economicService = require("./services/economic.service").default;
  const cron = require("node-cron");
  const alertService = require("./services/alert.service").default;

  cron.schedule("0 */6 * * *", async () => {
    try {
      const users = await prisma.user.findMany({ select: { id: true } });
      for (const user of users) await alertService.runAlertChecks(user.id);
    } catch (err) {
      logger.error("Alert check cron failed:", err);
    }
  });

  cron.schedule("0 8 * * *", async () => {
    try {
      await economicService.fetchInflationData();
      await economicService.fetchExchangeRate();
    } catch (err) {
      logger.error("Economic data refresh failed:", err);
    }
  });

  app.listen(PORT, async () => {
    logger.info(`\n🚀 BIZTerimbere API running on port ${PORT}`);
    logger.info(`📖 Swagger Docs: http://localhost:${PORT}/api/docs`);
    logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
    try {
      await economicService.fetchInflationData();
      await economicService.fetchExchangeRate();
      logger.info("✅ Economic data cache warmed up");
    } catch {
      logger.warn("⚠️  Could not pre-fetch economic data");
    }
  });

  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default app;
