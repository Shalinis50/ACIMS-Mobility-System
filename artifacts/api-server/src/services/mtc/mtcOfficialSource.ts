import https from "node:https";
import tls from "node:tls";
import { MTC_OFFICIAL_ROUTE_LIST_URL, MTC_SOURCE_LABEL } from "./mtcSchema.ts";

export type OfficialMtcRouteCatalogEntry = {
  routeId: string;
  routeNumber: string;
  source: string;
  retrievedAt: string;
};

const REQUEST_HEADERS = {
  "User-Agent": "ACIMS-MTC-Integration/1.0 (campus mobility; +https://mtcbus.tn.gov.in/)",
  Accept: "text/html",
};

/**
 * mtcbus.tn.gov.in presents only the leaf cert (Sectigo DV R36), not the intermediate.
 * Node does not chase AIA; browsers do. Trust this public Sectigo intermediate so
 * verification still runs against Node's root store. Do not disable TLS checks.
 * Intermediate valid 2021-03-22 → 2036-03-21. Source: Sectigo AIA.
 */
const SECTIGO_DV_R36_PEM = `-----BEGIN CERTIFICATE-----
MIIGTDCCBDSgAwIBAgIQOXpmzCdWNi4NqofKbqvjsTANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNMzYwMzIxMjM1OTU5WjBgMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTcwNQYDVQQDEy5TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gQ0EgRFYgUjM2MIIBojANBgkqhkiG9w0B
AQEFAAOCAY8AMIIBigKCAYEAljZf2HIz7+SPUPQCQObZYcrxLTHYdf1ZtMRe7Yeq
RPSwygz16qJ9cAWtWNTcuICc++p8Dct7zNGxCpqmEtqifO7NvuB5dEVexXn9RFFH
12Hm+NtPRQgXIFjx6MSJcNWuVO3XGE57L1mHlcQYj+g4hny90aFh2SCZCDEVkAja
EMMfYPKuCjHuuF+bzHFb/9gV8P9+ekcHENF2nR1efGWSKwnfG5RawlkaQDpRtZTm
M64TIsv/r7cyFO4nSjs1jLdXYdz5q3a4L0NoabZfbdxVb+CUEHfB0bpulZQtH1Rv
38e/lIdP7OTTIlZh6OYL6NhxP8So0/sht/4J9mqIGxRFc0/pC8suja+wcIUna0HB
pXKfXTKpzgis+zmXDL06ASJf5E4A2/m+Hp6b84sfPAwQ766rI65mh50S0Di9E3Pn
2WcaJc+PILsBmYpgtmgWTR9eV9otfKRUBfzHUHcVgarub/XluEpRlTtZudU5xbFN
xx/DgMrXLUAPaI60fZ6wA+PTAgMBAAGjggGBMIIBfTAfBgNVHSMEGDAWgBRWc1hk
lfmSGrASKgRieaFAFYghSTAdBgNVHQ4EFgQUaMASFhgOr872h6YyV6NGUV3LBycw
DgYDVR0PAQH/BAQDAgGGMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0lBBYwFAYI
KwYBBQUHAwEGCCsGAQUFBwMCMBsGA1UdIAQUMBIwBgYEVR0gADAIBgZngQwBAgEw
VAYDVR0fBE0wSzBJoEegRYZDaHR0cDovL2NybC5zZWN0aWdvLmNvbS9TZWN0aWdv
UHVibGljU2VydmVyQXV0aGVudGljYXRpb25Sb290UjQ2LmNybDCBhAYIKwYBBQUH
AQEEeDB2ME8GCCsGAQUFBzAChkNodHRwOi8vY3J0LnNlY3RpZ28uY29tL1NlY3Rp
Z29QdWJsaWNTZXJ2ZXJBdXRoZW50aWNhdGlvblJvb3RSNDYucDdjMCMGCCsGAQUF
BzABhhdodHRwOi8vb2NzcC5zZWN0aWdvLmNvbTANBgkqhkiG9w0BAQwFAAOCAgEA
YtOC9Fy+TqECFw40IospI92kLGgoSZGPOSQXMBqmsGWZUQ7rux7cj1du6d9rD6C8
ze1B2eQjkrGkIL/OF1s7vSmgYVafsRoZd/IHUrkoQvX8FZwUsmPu7amgBfaY3g+d
q1x0jNGKb6I6Bzdl6LgMD9qxp+3i7GQOnd9J8LFSietY6Z4jUBzVoOoz8iAU84OF
h2HhAuiPw1ai0VnY38RTI+8kepGWVfGxfBWzwH9uIjeooIeaosVFvE8cmYUB4TSH
5dUyD0jHct2+8ceKEtIoFU/FfHq/mDaVnvcDCZXtIgitdMFQdMZaVehmObyhRdDD
4NQCs0gaI9AAgFj4L9QtkARzhQLNyRf87Kln+YU0lgCGr9HLg3rGO8q+Y4ppLsOd
unQZ6ZxPNGIfOApbPVf5hCe58EZwiWdHIMn9lPP6+F404y8NNugbQixBber+x536
WrZhFZLjEkhp7fFXf9r32rNPfb74X/U90Bdy4lzp3+X1ukh1BuMxA/EEhDoTOS3l
7ABvc7BYSQubQ2490OcdkIzUh3ZwDrakMVrbaTxUM2p24N6dB+ns2zptWCva6jzW
r8IWKIMxzxLPv5Kt3ePKcUdvkBU/smqujSczTzzSjIoR5QqQA6lN1ZRSnuHIWCvh
JEltkYnTAH41QJ6SAWO66GrrUESwN/cgZzL4JLEqz1Y=
-----END CERTIFICATE-----`;

function httpsGetText(url: string, redirectsLeft = 5): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          ca: [...tls.rootCertificates, SECTIGO_DV_R36_PEM],
          headers: REQUEST_HEADERS,
        },
        (res) => {
          const status = res.statusCode ?? 0;
          const location = res.headers.location;
          if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
            res.resume();
            const next = new URL(location, url).toString();
            resolve(httpsGetText(next, redirectsLeft - 1));
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            resolve({ status, body: Buffer.concat(chunks).toString("utf8") });
          });
        },
      )
      .on("error", reject);
  });
}

/**
 * Reads the publicly published route register on the official MTC website (GET only).
 * Stage/timing detail uses separate sync paths when officially available.
 */
export async function fetchOfficialMtcRouteCatalog(): Promise<{
  routes: OfficialMtcRouteCatalogEntry[];
  retrievedAt: string;
}> {
  const retrievedAt = new Date().toISOString();
  const res = await httpsGetText(MTC_OFFICIAL_ROUTE_LIST_URL);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Official MTC site returned HTTP ${res.status}`);
  }

  const html = res.body;
  const routes: OfficialMtcRouteCatalogEntry[] = [];
  const seen = new Set<string>();

  const optionPattern = /<option\s+value="([^"]+)"[^>]*>([^<]*)<\/option>/gi;
  let match: RegExpExecArray | null;
  while ((match = optionPattern.exec(html)) !== null) {
    const value = match[1].trim();
    const label = (match[2] || value).trim();
    if (!value || value === "1" || value === "--Route--" || label.startsWith("--")) continue;
    const routeNumber = label || value;
    if (seen.has(value)) continue;
    seen.add(value);
    routes.push({
      routeId: value,
      routeNumber,
      source: MTC_SOURCE_LABEL,
      retrievedAt,
    });
  }

  if (routes.length === 0) {
    throw new Error("No routes parsed from official MTC route register page");
  }

  routes.sort((a, b) => a.routeNumber.localeCompare(b.routeNumber, undefined, { numeric: true }));

  return { routes, retrievedAt };
}
