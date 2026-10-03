/**
 * Sync official MTC route register from https://mtcbus.tn.gov.in/Home/routewiseinfo
 * Run: npm run mtc:sync
 */
import "dotenv/config";
import { syncMtcFromOfficialSource, getMtcIntegrationStatus } from "../artifacts/api-server/src/services/mtc/mtcService.ts";

async function main() {
  const result = await syncMtcFromOfficialSource();
  console.log(`MTC sync OK: ${result.routesImported} routes @ ${result.retrievedAt}`);
  console.log(JSON.stringify(getMtcIntegrationStatus().status, null, 2));
}

main().catch((err) => {
  console.error("MTC sync failed:", err);
  process.exit(1);
});
