import { getRequiredServerEnv, getJwtSecret } from '../../config/serverEnv.ts';
import { getOrCreateUser } from '../../db/users.ts';
import { createAuditLogEntry } from '../../db/repository.ts';
import {
  type AuthProviderType,
  ADMIN_OFFICIAL_EMAIL,
  signJwtToken,
  validateAuthCredentials,
} from '../../utils/donationLogic.ts';

const SOCIAL_PROVIDERS = [
  'google',
  'x',
  'apple',
  'github',
  'facebook',
  'instagram',
  'cloudflare',
] as const satisfies readonly AuthProviderType[];

type UserRole = 'admin' | 'donor' | 'fundraiser' | 'user';
const DEFAULT_APP_URL =
  'https://ais-dev-czjeul4wtggzbwcfeblieo-863474810067.asia-southeast1.run.app';

function getUserRole(value: unknown): UserRole {
  return value === 'admin' || value === 'fundraiser' || value === 'user' ? value : 'donor';
}

function getFallbackName(email: string): string {
  return email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function createSession(input: {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  category: string;
  provider: AuthProviderType;
  action: string;
}) {
  const user = await getOrCreateUser(
    input.uid,
    input.email,
    input.name,
    input.role,
    input.category,
    input.provider
  );
  const token = signJwtToken(
    {
      sub: user.uid,
      email: user.email,
      name: user.name,
      role: input.role,
      category: user.category || input.category,
      provider: input.provider,
    },
    getJwtSecret()
  );
  await createAuditLogEntry({
    actorName: user.name,
    actorRole: input.role,
    action: input.action,
    targetType: 'user',
    targetId: Number(user.id) || 1,
    details: `${user.name} (${user.email}) authenticated via ${input.provider} as [${input.role.toUpperCase()}].`,
  });
  return { user, token };
}

export async function authenticate(body: Record<string, unknown>, routeMode: 'login' | 'signup') {
  const mode = body.mode === 'signup' || routeMode === 'signup' ? 'signup' : 'signin';
  const role =
    body.role === 'admin' || body.role === 'fundraiser' || body.role === 'user'
      ? body.role
      : 'donor';
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '').trim();
  const category = String(
    body.category || (role === 'admin' ? 'All Categories' : 'Freelancer & Startup')
  ).trim();
  const rawName = String(body.name || '').trim();

  const credentials = validateAuthCredentials({
    mode,
    role,
    email,
    password,
    category,
    provider: 'email_jwt',
    adminPassword:
      role === 'admin' || email === ADMIN_OFFICIAL_EMAIL.toLowerCase()
        ? getRequiredServerEnv('ADMIN_LOGIN_PASSWORD')
        : undefined,
  });
  if (!credentials.valid) {
    return { status: 401, error: credentials.error || 'Invalid credentials' } as const;
  }

  const finalRole = credentials.normalizedRole;
  const finalName =
    finalRole === 'admin' ? 'Danish Khan' : rawName || email.split('@')[0] || 'Verified Member';
  const uid =
    finalRole === 'admin'
      ? 'demo-admin-uid'
      : `jwt-${finalRole}-${email.replace(/[^a-z0-9]/gi, '_')}`;
  const user = await getOrCreateUser(uid, email, finalName, finalRole, category, 'email_jwt');
  const token = signJwtToken(
    {
      sub: user.uid,
      email: user.email,
      name: user.name,
      role: finalRole,
      category: user.category || category,
      provider: 'email_jwt',
    },
    getJwtSecret()
  );

  await createAuditLogEntry({
    actorName: user.name,
    actorRole: finalRole,
    action: mode === 'signup' ? 'JWT_USER_REGISTERED_DB' : 'JWT_USER_AUTHENTICATED_DB',
    targetType: 'user',
    targetId: Number(user.id) || 1,
    details: `${user.name} (${user.email}) ${mode === 'signup' ? 'registered' : 'signed in'} via JWT & PostgreSQL DB as [${finalRole.toUpperCase()}] in category [${category}].`,
  });

  return {
    status: 200,
    token,
    response: {
      token,
      user,
      message: `Successfully ${mode === 'signup' ? 'created account and signed in' : 'signed in'} as ${user.name} (${finalRole.toUpperCase()} • ${category}).`,
    },
  } as const;
}

export async function authenticateSocial(body: Record<string, unknown>) {
  const provider = SOCIAL_PROVIDERS.includes(body.provider as (typeof SOCIAL_PROVIDERS)[number])
    ? (body.provider as (typeof SOCIAL_PROVIDERS)[number])
    : 'google';
  const requestedRole = getUserRole(body.role);
  const category = String(body.category || 'All Categories').trim();
  const email = String(body.email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return {
      status: 400,
      error: 'Please enter your email address to complete verified sign-in.',
    } as const;
  }

  const isFirebaseVerified = Boolean(body.firebaseUid || body.idToken);
  if (requestedRole === 'admin' && (!isFirebaseVerified || email !== ADMIN_OFFICIAL_EMAIL)) {
    return {
      status: 403,
      error:
        'Restricted Admin access: Only the authorized administrator can sign in as Admin.',
    } as const;
  }

  const role: UserRole =
    requestedRole === 'admin' && email === ADMIN_OFFICIAL_EMAIL ? 'admin' : requestedRole;
  const name = String(
    body.name || (email === ADMIN_OFFICIAL_EMAIL ? 'Danish Khan' : getFallbackName(email))
  ).trim();
  const uid = String(
    body.firebaseUid || body.socialUid || `${provider}-${email.replace(/[^a-z0-9]/gi, '_')}`
  );
  const { user, token } = await createSession({
    uid,
    email,
    name,
    role,
    category,
    provider,
    action: isFirebaseVerified
      ? `FIREBASE_${provider.toUpperCase()}_AUTH_LOGIN`
      : `OAUTH_${provider.toUpperCase()}_JWT_LOGIN`,
  });

  return {
    status: 200,
    token,
    response: {
      token,
      user,
      message: `Connected with ${provider.toUpperCase()} as ${user.name}.`,
    },
  } as const;
}

export async function authenticateFirebase(body: Record<string, unknown>) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { status: 400, error: 'Valid Firebase user email is required.' } as const;
  }

  const requestedRole = getUserRole(body.role);
  if (requestedRole === 'admin' && email !== ADMIN_OFFICIAL_EMAIL) {
    return {
      status: 403,
      error: 'Restricted Admin access: Only the authorized administrator can sign in as Admin.',
    } as const;
  }

  const role: UserRole =
    requestedRole === 'admin' && email === ADMIN_OFFICIAL_EMAIL ? 'admin' : requestedRole;
  const providerValue = String(body.provider || 'google').toLowerCase();
  const provider = SOCIAL_PROVIDERS.includes(
    providerValue as (typeof SOCIAL_PROVIDERS)[number]
  )
    ? (providerValue as (typeof SOCIAL_PROVIDERS)[number])
    : 'google';
  const category = String(body.category || 'All Categories').trim();
  const name = String(
    body.name || (email === ADMIN_OFFICIAL_EMAIL ? 'Danish Khan' : getFallbackName(email))
  ).trim();
  const uid = String(
    body.uid || body.firebaseUid || `firebase-${email.replace(/[^a-z0-9]/gi, '_')}`
  );
  const { user, token } = await createSession({
    uid,
    email,
    name,
    role,
    category,
    provider,
    action: `FIREBASE_${provider.toUpperCase()}_LOGIN`,
  });

  return {
    status: 200,
    token,
    response: {
      token,
      user,
      message: `Signed in via Firebase (${provider.toUpperCase()}) as ${user.name}.`,
    },
  } as const;
}

export function getOAuthAuthorizationUrl(input: {
  provider: string;
  role: string;
  category: string;
}) {
  const provider = input.provider.toLowerCase();
  const baseUrl = process.env.APP_URL || DEFAULT_APP_URL;
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/callback`;
  const state = Buffer.from(
    JSON.stringify({
      provider,
      role: input.role,
      category: input.category,
    })
  ).toString('base64url');

  if (provider === 'facebook' || provider === 'instagram') {
    const clientId =
      provider === 'facebook'
        ? process.env.FACEBOOK_CLIENT_ID || process.env.CLIENT_ID || ''
        : process.env.INSTAGRAM_CLIENT_ID || process.env.CLIENT_ID || '';
    const params = new URLSearchParams({
      client_id:
        clientId ||
        (provider === 'facebook' ? 'sankalpsetu_fb_client_id' : 'sankalpsetu_ig_client_id'),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider === 'facebook' ? 'email,public_profile' : 'user_profile,user_media',
      state,
    });
    const authorizeUrl =
      provider === 'facebook'
        ? `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
        : `https://api.instagram.com/oauth/authorize?${params.toString()}`;
    return { url: authorizeUrl, configured: Boolean(clientId), redirectUri };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '';
  const params = new URLSearchParams({
    client_id: clientId || 'sankalpsetu_google_client_id',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
    state,
  });
  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    configured: Boolean(clientId),
    redirectUri,
  };
}
