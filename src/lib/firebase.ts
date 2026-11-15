import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Set the VITE_FIREBASE_* web configuration before using Firebase.');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/gmail.send');

// Official Google OAuth 2.0 Client ID configured for SankalpSetu
export const GOOGLE_OAUTH_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').replace(/\s+/g, '');

let isSigningIn = false;
let cachedGoogleAccessToken: string | null = null;

export const initFirebaseAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedGoogleAccessToken) {
        onAuthSuccess?.(user, cachedGoogleAccessToken);
      } else if (!isSigningIn) {
        cachedGoogleAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedGoogleAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const googleSignInWithGmailScope = async (): Promise<{
  user?: User;
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const gsiWindow = window as any;
    if (gsiWindow.google?.accounts?.oauth2) {
      try {
        const tokenResponse = await new Promise<any>((resolve, reject) => {
          const client = gsiWindow.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
            callback: (resp: any) => {
              if (resp?.error) {
                reject(new Error(resp.error));
                return;
              }
              resolve(resp);
            },
            error_callback: (err: any) => {
              reject(new Error(err?.message || 'Google OAuth popup closed or blocked'));
            },
          });
          client.requestAccessToken({ prompt: 'consent' });
        });

        if (tokenResponse?.access_token) {
          cachedGoogleAccessToken = tokenResponse.access_token;
          let email: string | null = null;
          let displayName: string | null = 'Google Verified User';
          let uid = `google-${Date.now()}`;
          try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            if (profileRes.ok) {
              const profile = await profileRes.json();
              email = profile.email || null;
              displayName = profile.name || displayName;
              uid = profile.sub || uid;
            }
          } catch {
            // ignore profile lookup error
          }
          return {
            uid,
            email,
            displayName,
            accessToken: tokenResponse.access_token,
          };
        }
      } catch {
        // Fallback to Firebase signInWithPopup
      }
    }

    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || (await result.user.getIdToken());
    cachedGoogleAccessToken = token;
    return {
      user: result.user,
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      accessToken: token,
    };
  } finally {
    isSigningIn = false;
  }
};

export const getCachedGoogleAccessToken = (): string | null => {
  return cachedGoogleAccessToken;
};

export const setCachedGoogleAccessToken = (token: string | null) => {
  cachedGoogleAccessToken = token;
};

export const firebaseLogout = async () => {
  try {
    await auth.signOut();
  } finally {
    cachedGoogleAccessToken = null;
  }
};

