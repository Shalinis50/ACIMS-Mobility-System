import { resolveShiftTimingForBus } from "../../../../src/db/shiftManagement.ts";

export async function getBusShiftTimingContext(busId: string) {
  return resolveShiftTimingForBus(busId);
}
