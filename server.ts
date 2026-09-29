import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(__dirname, "server.bundle.js");

// In Cloud Run (K_SERVICE is set) or when bundled server exists, ensure NODE_ENV is production
if (process.env.K_SERVICE || fs.existsSync(bundlePath)) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }
}

async function main() {
  if (fs.existsSync(bundlePath)) {
    const { startServer } = await import("./server.bundle.js");
    await startServer();
  } else {
    // Development fallback
    const { startServer } = await import("./server-app.ts");
    await startServer();
  }
}

main().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
