import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const FALLBACK_SECRET = crypto.createHash('sha256').update(process.cwd() + '_zobowellness_jwt_key').digest('hex');

function getJwtSecret(): string {
  return process.env.JWT_SECRET && process.env.JWT_SECRET !== 'CHANGE_TO_A_STRONG_RANDOM_SECRET'
    ? process.env.JWT_SECRET
    : FALLBACK_SECRET;
}

export interface AdminTokenPayload {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminTokenPayload;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.zobo_admin_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  const decoded =
    (bearerToken ? verifyAdminToken(bearerToken) : null) ||
    (cookieToken ? verifyAdminToken(cookieToken) : null);

  if (!bearerToken && !cookieToken) {
    res.status(401).json({ error: 'Authentication required. Please log in as administrator.' });
    return;
  }

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    return;
  }

  req.admin = decoded;
  next();
}
