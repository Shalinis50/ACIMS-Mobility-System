export const REC_TRANSPORT_SOURCE_LABEL = "Official REC Transport (rectransport.com)";
export const REC_TRANSPORT_DEFAULT_TIMETABLE_URL = "https://www.rectransport.com/js/146routedec25.php";
export const REC_TRANSPORT_SITE = "https://www.rectransport.com/";

export type ParsedRecClock = {
  display: string;
  time24: string | null;
  meridiem: "AM" | "PM" | null;
};

export type ParsedRecIndexRoute = {
  serial: number;
  routeNumber: string;
  routeName: string;
  boardingHref: string;
  startingTimeDisplay: string;
};

export type ParsedRecStop = {
  stopName: string;
  timeDisplay: string;
  isCampus: boolean;
};

export type ParsedRecBoardingPage = {
  heading: string;
  viaNotes: string | null;
  stops: ParsedRecStop[];
};

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseRecClock(raw: string, previousMeridiem: "AM" | "PM" | null = null): ParsedRecClock {
  const display = decodeBasicEntities(raw);
  const match = display.match(/(\d{1,2})[.:](\d{2})(?:\s*(am|pm))?/i);
  if (!match) {
    return { display, time24: null, meridiem: previousMeridiem };
  }
  let hour = Number(match[1]);
  const minute = match[2];
  const tagged = match[3]?.toLowerCase();
  let meridiem: "AM" | "PM" | null = tagged === "pm" ? "PM" : tagged === "am" ? "AM" : previousMeridiem;
  if (!meridiem) {
    meridiem = hour >= 1 && hour <= 11 ? "AM" : hour === 12 ? "PM" : "AM";
  }
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  const time24 = `${String(hour).padStart(2, "0")}:${minute}`;
  return { display, time24, meridiem };
}

export function parseRecIndexPage(html: string, pageUrl: string): ParsedRecIndexRoute[] {
  const routes: ParsedRecIndexRoute[] = [];
  const rowRe =
    /<tr>\s*<td class=["']?sno["']?>\s*(\d+)\s*<\/td>\s*<td class=["']?rno["']?>\s*([^<]+?)\s*<\/td>\s*<td class=["']?rname["']?>\s*([^<]+?)\s*<\/td>\s*<td class=["']?time["']?>\s*<a href=["']([^"']+)["']>[\s\S]*?<\/a>\s*<\/td>\s*<td class=["']?start1["']?>\s*([^<]+?)\s*<\/td>/gi;
  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(html))) {
    const href = decodeBasicEntities(match[4]);
    routes.push({
      serial: Number(match[1]),
      routeNumber: decodeBasicEntities(match[2]),
      routeName: decodeBasicEntities(match[3]),
      boardingHref: new URL(href, pageUrl).toString(),
      startingTimeDisplay: decodeBasicEntities(match[5]),
    });
  }
  return routes;
}

export function parseRecBoardingPage(html: string): ParsedRecBoardingPage {
  const headingMatch = html.match(/class=["']?bbpt["']?>([^<]+)</i);
  const viaMatch = html.match(/class=["']?via["']?[\s\S]*?<b>Via[^<]*<\/b>\s*([^<]+)/i);
  const stops: ParsedRecStop[] = [];
  const stopRe = /<td class=["']?bpt["']?>([^<]+)<\/td>\s*<td class=["']?tim["']?>([^<]*)<\/td>/gi;
  let match: RegExpExecArray | null;
  while ((match = stopRe.exec(html))) {
    const stopName = decodeBasicEntities(match[1]);
    if (!stopName) continue;
    stops.push({
      stopName,
      timeDisplay: decodeBasicEntities(match[2]),
      isCampus: /college campus/i.test(stopName),
    });
  }
  return {
    heading: headingMatch ? decodeBasicEntities(headingMatch[1]) : "",
    viaNotes: viaMatch ? decodeBasicEntities(viaMatch[1]).replace(/,$/, "") : null,
    stops,
  };
}

export function recRouteId(routeNumber: string): string {
  return `rec-route-${routeNumber.trim().toLowerCase()}`;
}

export function recStopId(routeNumber: string, sequence: number): string {
  return `rec-stop-${routeNumber.trim().toLowerCase()}-${sequence}`;
}

export function recBusId(routeNumber: string): string {
  return `rec-bus-${routeNumber.trim().toLowerCase()}`;
}
