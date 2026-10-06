import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(__dirname, "server.bundle.js");
const distPath = path.resolve(__dirname, "artifacts/acims/dist/index.html");

const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
const isProd = process.env.NODE_ENV === "production" || isCloudRun;

async function main() {
  if (isProd && fs.existsSync(bundlePath)) {
    const { startServer } = await import("./server.bundle.js");
    await startServer();
  } else {
    // Development or dynamic Vite server (executed via tsx in dev)
    const { startServer } = await import("./server-app.ts");
    await startServer();
  }
}

main().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
