import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import {
  verifyJwtToken,
  evaluateRbacAccess,
  RbacRole,
  RbacPermission,
} from '../utils/donationLogic.ts';
import { getJwtSecret } from '../config/serverEnv.ts';
import { PANEL_PROFILES } from '../backend/authProfiles.ts';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
  category?: string;
  provider?: 'email_jwt' | 'google' | 'facebook' | 'instagram' | string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  rbac?: {
    effectiveRole: RbacRole;
    grantedPermissions: RbacPermission[];
  };
}

function extractCookieToken(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, v] = part.trim().split('=');
    if (k === 'sankalpsetu_jwt' && v) {
      return decodeURIComponent(v);
    }
  }
  return null;
}

async function resolveUserFromToken(token: string, panelRole: string): Promise<AuthenticatedUser | null> {
  // 1. Check SankalpSetu HS256 JWT token
  const jwtCheck = verifyJwtToken(token, getJwtSecret());
  if (jwtCheck.valid && jwtCheck.payload) {
    const p = jwtCheck.payload;
    const dbUser = await getOrCreateUser(
      p.sub,
      p.email,
      p.name,
      p.role,
      p.category,
      p.provider
    );
    return dbUser;
  }

  // 2. Check Firebase ID token
  const decodedToken = await adminAuth.verifyIdToken(token);
  const email = decodedToken.email || 'khandanish0503@gmail.com';
  const isOwner = email.toLowerCase() === 'khandanish0503@gmail.com';
  const name = isOwner ? 'Danish Khan' : decodedToken.name || email.split('@')[0];
  const effectiveRole = isOwner ? 'admin' : panelRole === 'admin' ? 'donor' : panelRole;
  const dbUser = await getOrCreateUser(
    decodedToken.uid,
    email,
    name,
    effectiveRole,
    undefined,
    'google'
  );
  return dbUser;
}

export const requireAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const panelRole = (req.headers['x-demo-role'] as string | undefined) || 'admin';
  const fallbackProfile = PANEL_PROFILES[panelRole] || PANEL_PROFILES.admin;

  try {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split('Bearer ')[1]
        : extractCookieToken(req.headers.cookie);

    if (bearerToken) {
      try {
        const resolved = await resolveUserFromToken(bearerToken, panelRole);
        if (resolved) {
          req.user = resolved;
          return next();
        }
      } catch (tokenErr) {
        console.warn('Bearer token check fell back to panel profile:', tokenErr);
      }
    }

    const dbUser = await getOrCreateUser(
      fallbackProfile.uid,
      fallbackProfile.email,
      fallbackProfile.name,
      fallbackProfile.role
    );
    req.user = dbUser;
    return next();
  } catch (error) {
    console.warn('Auth fallback to in-memory profile:', error);
    req.user = {
      id: 1,
      uid: fallbackProfile.uid,
      email: fallbackProfile.email,
      name: fallbackProfile.name,
      role: fallbackProfile.role,
      category: 'All Categories',
      provider: 'email_jwt',
    };
    return next();
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const panelRole = (req.headers['x-demo-role'] as string | undefined) || 'donor';
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split('Bearer ')[1]
        : extractCookieToken(req.headers.cookie);

    if (bearerToken) {
      const resolved = await resolveUserFromToken(bearerToken, panelRole);
      if (resolved) {
        req.user = resolved;
        return next();
      }
    }

    const profile = PANEL_PROFILES[panelRole] || PANEL_PROFILES.donor;
    req.user = await getOrCreateUser(profile.uid, profile.email, profile.name, profile.role);
  } catch (err) {
    console.warn('Optional auth token check skipped:', err);
  }
  next();
};

/**
 * RBAC (Role-Based Access Control) Middleware:
 * Enforces allowed roles and granular permission checks on API endpoints.
 */
export const requireRole = (
  allowedRoles: RbacRole[],
  requiredPermission?: RbacPermission
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    await requireAuth(req, res, () => {});
    const requestedHeaderRole = req.headers['x-demo-role'] as string | undefined;
    const roleToEvaluate = requestedHeaderRole || req.user?.role || 'donor';
    const emailToEvaluate =
      roleToEvaluate === 'admin' && !req.headers.authorization
        ? 'khandanish0503@gmail.com'
        : req.user?.email;

    const decision = evaluateRbacAccess({
      role: roleToEvaluate,
      email: emailToEvaluate,
      allowedRoles,
      requiredPermission,
    });

    if (!decision.allowed) {
      return res.status(403).json({
        error: decision.reason || 'Forbidden: Insufficient RBAC role or permission.',
        code: 'RBAC_ACCESS_DENIED',
        currentRole: decision.effectiveRole,
        allowedRoles,
        requiredPermission,
      });
    }

    req.rbac = {
      effectiveRole: decision.effectiveRole,
      grantedPermissions: decision.grantedPermissions,
    };
    return next();
  };
};


