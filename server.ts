import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(__dirname, "server.bundle.js");
const distPath = path.resolve(__dirname, "artifacts/acims/dist/index.html");

const isProd = process.env.NODE_ENV === "production";

async function main() {
  console.log("[server.ts] Starting main...", { isProd, bundlePathExists: fs.existsSync(bundlePath) });
  if (isProd && fs.existsSync(bundlePath)) {
    console.log("[server.ts] Importing bundle...");
    const { startServer } = await import("./server.bundle.js");
    await startServer();
  } else {
    console.log("[server.ts] Importing server-app.ts...");
    const { startServer } = await import("./server-app.ts");
    console.log("[server.ts] Calling startServer()...");
    await startServer();
    console.log("[server.ts] startServer() completed!");
  }
}

main().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
