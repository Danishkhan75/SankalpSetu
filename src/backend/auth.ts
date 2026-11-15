import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser, type UserRecord } from '../db/users.ts';
import { getJwtSecret } from '../config/serverEnv.ts';
import {
  type RbacPermission,
  type RbacRole,
  ADMIN_OFFICIAL_EMAIL,
  evaluateRbacAccess,
  verifyJwtToken,
} from '../utils/donationLogic.ts';
import { PANEL_PROFILES } from './authProfiles.ts';

type AuthMode = 'required' | 'optional';

function getCookieToken(cookieHeader: string | null): string | null {
  for (const cookie of (cookieHeader || '').split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name === 'sankalpsetu_jwt' && valueParts.length) {
      try {
        return decodeURIComponent(valueParts.join('='));
      } catch {
        return valueParts.join('=');
      }
    }
  }
  return null;
}

async function resolveTokenUser(token: string, panelRole: string): Promise<UserRecord | null> {
  const jwt = verifyJwtToken(token, getJwtSecret());
  if (jwt.valid && jwt.payload) {
    const payload = jwt.payload;
    return getOrCreateUser(
      payload.sub,
      payload.email,
      payload.name,
      payload.role,
      payload.category,
      payload.provider
    );
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const email = decoded.email || ADMIN_OFFICIAL_EMAIL;
  const isOwner = email.toLowerCase() === ADMIN_OFFICIAL_EMAIL.toLowerCase();
  return getOrCreateUser(
    decoded.uid,
    email,
    isOwner ? 'Danish Khan' : decoded.name || email.split('@')[0],
    isOwner ? 'admin' : panelRole === 'admin' ? 'donor' : panelRole,
    undefined,
    'google'
  );
}

export async function getRequestUser(request: Request, mode: AuthMode): Promise<UserRecord | undefined> {
  const panelRole =
    request.headers.get('x-demo-role') || (mode === 'required' ? 'admin' : 'donor');
  const fallbackProfile =
    PANEL_PROFILES[panelRole] || PANEL_PROFILES[mode === 'required' ? 'admin' : 'donor'];
  const authorization = request.headers.get('authorization');
  const token =
    authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : getCookieToken(request.headers.get('cookie'));

  if (token) {
    try {
      const user = await resolveTokenUser(token, panelRole);
      if (user) return user;
    } catch {
      // Invalid or unavailable token services retain the legacy panel fallback.
    }
  }

  try {
    return await getOrCreateUser(
      fallbackProfile.uid,
      fallbackProfile.email,
      fallbackProfile.name,
      fallbackProfile.role
    );
  } catch {
    return {
      id: 1,
      ...fallbackProfile,
      category: fallbackProfile.role === 'admin' ? 'All Categories' : 'Personal & Family',
      provider: 'email_jwt',
      createdAt: new Date(),
    };
  }
}

export async function authorizeRequest(
  request: Request,
  allowedRoles: RbacRole[],
  requiredPermission?: RbacPermission
) {
  const user = await getRequestUser(request, 'required');
  const requestedRole = request.headers.get('x-demo-role') || user?.role || 'donor';
  const email =
    requestedRole === 'admin' && !request.headers.get('authorization')
      ? ADMIN_OFFICIAL_EMAIL
      : user?.email;
  const decision = evaluateRbacAccess({
    role: requestedRole,
    email,
    allowedRoles,
    requiredPermission,
  });

  return { user, decision };
}
