import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import router from "./artifacts/api-server/src/routes/index";
import { startBusSimulation } from "./artifacts/api-server/src/routes/buses";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Detect distribution folder if built
  const candidatePaths = [
    path.resolve(__dirname, "artifacts/acims/dist"),
    path.resolve(__dirname, "dist"),
  ];
  const distPath = candidatePaths.find((p) => fs.existsSync(path.join(p, "index.html")));
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const isProd = process.env.NODE_ENV === "production" || isCloudRun || Boolean(distPath);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Immediate health check for Cloud Run and container liveness probes
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Start bus simulation
  try {
    startBusSimulation();
  } catch (err) {
    console.warn("Could not start bus simulation immediately:", err);
  }

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
  } else if (!isProd) {
    console.log("Starting in development mode with Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
      },
      appType: "spa",
      root: path.resolve(__dirname, "artifacts/acims"),
    });
    app.use(vite.middlewares);
  } else {
    // Production requested but distPath not found yet
    console.warn("Production mode active but distPath index.html was not found; fallback placeholder active.");
    app.use((_req, res) => {
      res.status(200).send("ACIMS Mobility System service is initializing.");
    });
  }

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`ACIMS Mobility System server listening on http://0.0.0.0:${port}`);
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
