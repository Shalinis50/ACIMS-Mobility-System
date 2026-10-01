import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email?: string; role?: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no Bearer token, check if x-acims-user-id header is provided (for campus prototype fallback)
    const customUserId = req.header('x-acims-user-id');
    if (customUserId) {
      req.user = { uid: customUserId, role: req.header('x-acims-role') || 'STUDENT' };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    // If verification fails but token is a campus token format
    const customUserId = req.header('x-acims-user-id');
    if (customUserId) {
      req.user = { uid: customUserId, role: req.header('x-acims-role') || 'STUDENT' };
      return next();
    }
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
