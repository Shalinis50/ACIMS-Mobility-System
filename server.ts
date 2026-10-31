import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, "").trim();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(__dirname, "server.bundle.js");
const distPath = path.resolve(__dirname, "artifacts/acims/dist/index.html");

const isRunningWithTsx = Boolean(
  process.env.TSX_TSCONFIG_PATH ||
  process.execArgv.some((a) => a.includes("tsx")) ||
  process.env.npm_lifecycle_event === "dev"
);

// If running in production or plain node without tsx, or if dist exists, treat as production
const isProd = process.env.NODE_ENV === "production" || !isRunningWithTsx || fs.existsSync(distPath);

if (isProd && !process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

async function main() {
  if (fs.existsSync(bundlePath)) {
    const { startServer } = await import("./server.bundle.js");
    await startServer();
  } else if (!isRunningWithTsx) {
    // If running with node in production and bundlePath is missing, bundle on the fly
    console.log("Generating server.bundle.js with esbuild...");
    const { buildSync } = await import("esbuild");
    buildSync({
      entryPoints: ["server-app.ts"],
      bundle: true,
      platform: "node",
      format: "esm",
      external: [
        "express",
        "cors",
        "pino",
        "pino-http",
        "vite",
        "pg",
        "drizzle-orm",
        "firebase-admin",
        "@electric-sql/pglite",
        "@google/genai",
        "socket.io",
      ],
      outfile: bundlePath,
    });
    const { startServer } = await import("./server.bundle.js");
    await startServer();
  } else {
    // Development or dynamic Vite server (executed via tsx in dev)
    const { startServer } = await import("./server-app.ts");
    await startServer();
  }
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
