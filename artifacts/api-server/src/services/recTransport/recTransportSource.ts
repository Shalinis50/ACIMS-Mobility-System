import https from "node:https";
import { REC_TRANSPORT_SITE } from "./recTransportParser.ts";

const REQUEST_HEADERS = {
  "User-Agent": "ACIMS-REC-Transport/1.0 (campus mobility; +https://www.rectransport.com/)",
  Accept: "text/html,application/xhtml+xml",
};

export function fetchRecTransportHtml(url: string, redirectsLeft = 5): Promise<{ status: number; body: string; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: REQUEST_HEADERS, timeout: 20000 }, (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
          res.resume();
          const next = new URL(location, url).toString();
          resolve(fetchRecTransportHtml(next, redirectsLeft - 1));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status,
            body: Buffer.concat(chunks).toString("utf8"),
            finalUrl: url,
          });
        });
      })
      .on("timeout", function () {
        this.destroy(new Error(`Timeout fetching ${url}`));
      })
      .on("error", reject);
  });
}

export function recTransportBaseUrl(): string {
  return REC_TRANSPORT_SITE;
}
