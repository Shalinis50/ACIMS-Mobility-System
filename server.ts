import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(__dirname, "server.bundle.js");
const distPath = path.resolve(__dirname, "artifacts/acims/dist/index.html");

const isProduction = (process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE)) && fs.existsSync(distPath);

async function main() {
  if (isProduction && fs.existsSync(bundlePath)) {
    const { startServer } = await import("./server.bundle.js");
    await startServer();
  } else {
    // Development or dynamic Vite server
    const { startServer } = await import("./server-app.ts");
    await startServer();
  }
}

main().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
