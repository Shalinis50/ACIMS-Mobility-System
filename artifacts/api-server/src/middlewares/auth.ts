import type { Request, Response, NextFunction } from "express";
import { verifySession, type AuthSessionUser } from "../services/auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthSessionUser | null;
    }
  }
}

/**
 * Middleware that populates req.user from verified PostgreSQL session token.
 */
export async function authenticateSession(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  let token: string | undefined;

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (req.header("x-acims-token")) {
    token = req.header("x-acims-token")?.trim();
  } else if ((req as any).cookies?.acims_session_token) {
    token = (req as any).cookies.acims_session_token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = await verifySession(token);
    req.user = user;
  } catch (err) {
    console.error("[Auth Middleware] Session lookup error:", err);
    req.user = null;
  }

  next();
}

/**
 * Middleware requiring ANY valid authenticated user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }
  next();
}

/**
 * Middleware requiring specific role(s) ('student', 'driver', 'admin').
 * Rejects unauthenticated with 401, wrong role with 403.
 */
export function requireRole(...allowedRoles: ("student" | "driver" | "admin")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Unauthorized role" });
      return;
    }
    next();
  };
}
