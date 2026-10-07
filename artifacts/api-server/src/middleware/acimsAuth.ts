import type { NextFunction, Request, Response } from "express";
import { requireAuth, type AuthRequest } from "../../../../src/middleware/auth.ts";

export { requireAuth };

function resolveRole(req: Request): string {
  const authReq = req as AuthRequest;
  const headerRole = req.header("x-acims-role");
  const tokenRole = (authReq.user as { role?: string } | undefined)?.role;
  return String(tokenRole || headerRole || "STUDENT").toUpperCase();
}

export function requireRole(...roles: string[]) {
  const allowed = new Set(roles.map((r) => r.toUpperCase()));
  return (req: Request, res: Response, next: NextFunction) => {
    const role = resolveRole(req);
    if (!allowed.has(role)) {
      res.status(403).json({ error: `Forbidden: requires one of ${roles.join(", ")}` });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole("ADMIN");

export function requireDriver(req: Request, res: Response, next: NextFunction) {
  const role = resolveRole(req);
  if (role === "ADMIN" || role === "DRIVER") {
    next();
    return;
  }
  const driverId = req.header("x-acims-driver-id");
  if (driverId) {
    (req as AuthRequest).user = { uid: driverId, role: "DRIVER" };
    next();
    return;
  }
  res.status(403).json({ error: "Forbidden: driver role required" });
}

/** Optional auth: attaches user when present, does not block. */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    const uid = req.header("x-acims-user-id");
    if (uid) {
      (req as AuthRequest).user = { uid, role: req.header("x-acims-role") || "STUDENT" };
    }
    return next();
  }
  return requireAuth(req as AuthRequest, res, next);
}
