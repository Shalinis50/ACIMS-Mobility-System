/**
 * Sync official REC college-bus routes, pickup points, and timings
 * from https://www.rectransport.com/js/146routedec25.php (override with REC_TRANSPORT_TIMETABLE_URL).
 * Run: npm run rec:sync
 * Publish boarding points into ACIMS official pickups: npm run rec:publish
 *   or npm run rec:sync -- --publish
 */
import "dotenv/config";
import { bootstrapCoreTables } from "../src/db/bootstrapCoreTables.ts";
import {
  getRecTransportStatus,
  publishAllOfficialPickups,
  syncRecTransportFromOfficialSource,
} from "../artifacts/api-server/src/services/recTransport/recTransportService.ts";

async function main() {
  await bootstrapCoreTables();
  const args = process.argv.slice(2);
  const publishOnly = args.includes("--publish-only");
  const publish = publishOnly || args.includes("--publish") || process.env.REC_TRANSPORT_PUBLISH_PICKUPS === "1";
  const timetableUrl = args.find((arg) => !arg.startsWith("--")) || process.env.REC_TRANSPORT_TIMETABLE_URL;

  if (!publishOnly) {
    const result = await syncRecTransportFromOfficialSource({ timetableUrl, publishOfficialPickups: false });
    console.log(
      `REC transport sync OK: ${result.routesImported} routes, ${result.stopsImported} stops @ ${result.retrievedAt}`,
    );
    if (result.boardingFailures) {
      console.warn(`${result.boardingFailures} boarding pages failed`);
    }
  }

  if (publish) {
    const published = await publishAllOfficialPickups();
    console.log(
      `Official pickup points updated: ${published.published} pickups from ${published.routesPublished} routes (${published.deactivated} stale/dummy deactivated)`,
    );
  }

  console.log(JSON.stringify(await getRecTransportStatus(), null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("REC transport sync failed:", err);
  process.exit(1);
});
