import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import router from "./artifacts/api-server/src/routes/index";
import { startBusSimulation } from "./artifacts/api-server/src/routes/buses";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === "production";

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Start bus simulation
  try {
    startBusSimulation();
  } catch (err) {
    console.warn("Could not start bus simulation immediately:", err);
  }

  // API routes
  app.use("/api", router);

  if (!isProd) {
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
    const distPath = path.resolve(__dirname, "artifacts/acims/dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`ACIMS Mobility System server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
