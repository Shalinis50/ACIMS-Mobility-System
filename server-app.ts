import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import router from "./artifacts/api-server/src/routes/index";
import {
  buildBusTelemetry,
  ingestRealDriverGps,
} from "./artifacts/api-server/src/routes/buses";
import { realtimeHub } from "./artifacts/api-server/src/services/realtimeHub";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer() {
  const { bootstrapAppTables, ensureBaselineFleetData } = await import("./src/db/bootstrapAppTables.ts");
  await bootstrapAppTables();
  const { bootstrapCoreTables } = await import("./src/db/bootstrapCoreTables.ts");
  await bootstrapCoreTables();
  const { migrateMobilitySchemaColumns } = await import("./src/db/bootstrapAppTables.ts");
  await migrateMobilitySchemaColumns();
  await ensureBaselineFleetData();
  const { seedInitialDemoRoutes } = await import("./src/db/initialDemoRoutes.ts");
  await seedInitialDemoRoutes();
  const { ensureCanonicalShiftSlots } = await import("./src/db/shiftManagement.ts");
  await ensureCanonicalShiftSlots();
  const { ensureOfficialPickupPointsFromRoutes } = await import("./src/db/ensureMobilityPickups.ts");
  await ensureOfficialPickupPointsFromRoutes();
  try {
    const { seedDatabase } = await import("./src/db/seed.ts");
    await seedDatabase();
  } catch (err) {
    console.warn("Baseline seed skipped:", err);
  }

  const { ensureMtcSchema, purgeLegacyDummyMtcFromTransitDb } = await import(
    "./artifacts/api-server/src/services/mtc/mtcService.ts"
  );
  ensureMtcSchema();
  purgeLegacyDummyMtcFromTransitDb();

  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Detect distribution folder if built
  const candidatePaths = [
    path.resolve(__dirname, "artifacts/acims/dist"),
    path.resolve(__dirname, "dist"),
  ];
  const distPath = candidatePaths.find((p) => fs.existsSync(path.join(p, "index.html")));
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const isProd = (process.env.NODE_ENV === "production" || isCloudRun) && Boolean(distPath);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Immediate health check for Cloud Run and container liveness probes
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // API routes
  app.use("/api", router);

  if (isProd && distPath) {
    console.log(`Serving static production build from ${distPath}`);
    app.use(express.static(distPath));
    app.use((_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application build artifacts not found.");
      }
    });
  } else {
    console.log("Starting in development mode with Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "artifacts/acims/vite.config.ts"),
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
      },
      appType: "spa",
      root: path.resolve(__dirname, "artifacts/acims"),
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`ACIMS Mobility System server listening on http://0.0.0.0:${port}`);
  });

  // Attach Socket.IO server with bus-specific rooms (`bus:<busId>`) on the same HTTP server
  realtimeHub.attachSocketServer(server, {
    onDriverLocationIngest: async (payload) => {
      const res = await ingestRealDriverGps(payload);
      return {
        ok: res.ok,
        telemetry: res.telemetry,
        error: res.error,
      };
    },
    resolveBusSnapshot: async (busId) => {
      return buildBusTelemetry(busId);
    },
  });

  // Graceful shutdown for Cloud Run
  const shutdown = () => {
    console.log("Shutting down server gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return server;
}
