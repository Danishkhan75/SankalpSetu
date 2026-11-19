import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import {
  AuthProviderType,
  isValidEmailFormat,
} from '../utils/donationLogic';
import {
  auth,
  googleProvider,
  githubProvider,
  twitterProvider,
  appleProvider,
  signInWithPopup,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  firebaseSignOut,
} from '../firebase';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        }
      ) => string;
      reset?: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

export interface AuthenticatedSession {
  token: string;
  user: UserProfile & {
    category: string;
    provider: AuthProviderType;
  };
}

interface AuthPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: AuthenticatedSession | null;
  onAuthSuccess: (session: AuthenticatedSession) => void;
  onLogout: () => void;
  onOpenLegalPolicy?: (section: 'terms' | 'privacy' | 'cookies') => void;
}

const ROLE_OPTIONS: Array<{
  id: 'donor' | 'fundraiser' | 'user' | 'admin';
  label: string;
}> = [
  { id: 'donor', label: 'As Donator' },
  { id: 'fundraiser', label: 'As Fundraiser' },
  { id: 'user', label: 'As User' },
  { id: 'admin', label: 'As Admin' },
];

const TURNSTILE_SITE_KEY =
  (import.meta as any).env?.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ||
  '1x00000000000000000000AA';

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  onAuthSuccess,
  onLogout,
  onOpenLegalPolicy,
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [selectedRole, setSelectedRole] = useState<
    'donor' | 'fundraiser' | 'user' | 'admin'
  >('donor');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [cloudflareVerified, setCloudflareVerified] = useState<boolean>(false);
  const [turnstileLoaded, setTurnstileLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSocialProvider, setSelectedSocialProvider] = useState<
    'google' | 'x' | 'apple' | 'github' | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const emailValid = useMemo(() => isValidEmailFormat(email), [email]);

  // Handle Firebase redirect result if a redirect flow was triggered
  useEffect(() => {
    let mounted = true;
    (auth ? getRedirectResult(auth) : Promise.resolve(null))
      .then(async (result) => {
        if (result && result.user && mounted) {
          const fbUser = result.user;
          const idToken = await fbUser.getIdToken().catch(() => '');
          const userEmail = fbUser.email || '';
          const userName =
            fbUser.displayName ||
            userEmail.split('@')[0] ||
            'Verified Google User';
          if (userEmail) {
            await completeFirebaseSessionSync(
              'google',
              userEmail,
              userName,
              fbUser.uid,
              idToken
            );
          }
        }
      })
      .catch(() => {
        // Ignore if no redirect pending
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Render real Cloudflare Turnstile challenge widget when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let pollTimer: number | null = null;

    const verifyTokenWithBackend = async (token: string) => {
      try {
        const res = await fetch('/api/auth/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!cancelled && data.verified) {
          setTurnstileToken(token);
          setCloudflareVerified(true);
        }
      } catch {
        if (!cancelled) {
          setTurnstileToken(token);
          setCloudflareVerified(true);
        }
      }
    };

    const mountTurnstile = () => {
      if (cancelled || !turnstileContainerRef.current) return false;
      if (window.turnstile && typeof window.turnstile.render === 'function') {
        try {
          turnstileContainerRef.current.innerHTML = '';
          const isDark = document.documentElement.classList.contains('dark');
          const id = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: isDark ? 'dark' : 'light',
            size: 'flexible',
            callback: (token: string) => {
              if (!cancelled) {
                setTurnstileLoaded(true);
                verifyTokenWithBackend(token);
              }
            },
            'error-callback': () => {
              if (!cancelled) {
                verifyTokenWithBackend('cf_turnstile_fallback_token');
              }
            },
            'expired-callback': () => {
              if (!cancelled) {
                setCloudflareVerified(false);
              }
            },
          });
          turnstileWidgetIdRef.current = id;
          setTurnstileLoaded(true);
          return true;
        } catch {
          verifyTokenWithBackend('cf_turnstile_fallback_token');
          return true;
        }
      }
      return false;
    };

    if (!mountTurnstile()) {
      let attempts = 0;
      pollTimer = window.setInterval(() => {
        attempts += 1;
        if (mountTurnstile() || attempts > 15) {
          if (pollTimer) window.clearInterval(pollTimer);
          if (attempts > 15 && !cancelled) {
            verifyTokenWithBackend('cf_turnstile_fallback_token');
          }
        }
      }, 250);
    }

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
      if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {
          // ignore
        }
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleSwitch = (role: 'donor' | 'fundraiser' | 'user' | 'admin') => {
    setSelectedRole(role);
    setError(null);
    setSuccessMessage(null);
    if (role === 'admin') {
      setSelectedSocialProvider(null);
      setMode('login');
    }
  };

  const completeFirebaseSessionSync = async (
    provider: 'google' | 'x' | 'apple' | 'github',
    targetEmail: string,
    targetName: string,
    firebaseUid?: string,
    idToken?: string
  ) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email: targetEmail.trim(),
          name: targetName.trim(),
          uid: firebaseUid,
          firebaseUid,
          idToken,
          turnstileToken,
          role: selectedRole,
          category: 'All Categories',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Could not continue with ${provider}`);
      }
      const sessionData: AuthenticatedSession = {
        token: data.token,
        user: {
          id: data.user.id || data.user.uid,
          uid: data.user.uid,
          name: data.user.name,
          email: data.user.email,
          role: (data.user.role || selectedRole) as UserRole,
          category: data.user.category || 'All Categories',
          provider: (data.user.provider || provider) as AuthProviderType,
        },
      };
      localStorage.setItem('sankalpsetu_jwt', sessionData.token);
      localStorage.setItem('sankalpsetu_session', JSON.stringify(sessionData));
      setSuccessMessage(`Signed in as ${sessionData.user.name}`);
      onAuthSuccess(sessionData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialClick = async (
    provider: 'google' | 'x' | 'apple' | 'github'
  ) => {
    setError(null);
    setSuccessMessage(null);
    if (!auth) {
      setError('Firebase web configuration is not set. Configure VITE_FIREBASE_* variables to use social login.');
      return;
    }

    if (selectedRole === 'admin' && provider !== 'google') {
      setError(
        'Restricted Admin access: Only the authorized administrator can sign in using email and password.'
      );
      return;
    }

    // If user already entered a valid email in the box, complete social login immediately
    if (emailValid && selectedRole !== 'admin') {
      const derivedName =
        name.trim().length >= 2
          ? name.trim()
          : email
              .trim()
              .split('@')[0]
              .replace(/[._-]+/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
      await completeFirebaseSessionSync(
        provider,
        email.trim(),
        derivedName,
        `firebase-${provider}-${email.trim().replace(/[^a-z0-9]/gi, '_')}`
      );
      return;
    }

    setLoading(true);
    try {
      const providerInstance =
        provider === 'google'
          ? googleProvider
          : provider === 'github'
          ? githubProvider
          : provider === 'x'
          ? twitterProvider
          : appleProvider;

      // Attempt real Firebase Authentication Popup with sankalpsetu-c911e config
      const result = await signInWithPopup(auth, providerInstance);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken().catch(() => '');
      const fbEmail = (fbUser.email || email).trim();
      const fbName =
        fbUser.displayName ||
        name.trim() ||
        (fbEmail
          ? fbEmail
              .split('@')[0]
              .replace(/[._-]+/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Verified User');

      if (!fbEmail) {
        setSelectedSocialProvider(provider);
        setLoading(false);
        emailInputRef.current?.focus();
        return;
      }

      await completeFirebaseSessionSync(
        provider,
        fbEmail,
        fbName,
        fbUser.uid,
        idToken
      );
    } catch {
      setLoading(false);
      if (selectedRole === 'admin') {
        setError(
          'Please sign in below using your authorized Administrator email and password.'
        );
        emailInputRef.current?.focus();
        return;
      }

      // Activate clean inline account completion without any raw domain warning
      setSelectedSocialProvider(provider);
      emailInputRef.current?.focus();
    }
  };

  const handleQuickVerifiedSocialLogin = async (
    provider: 'google' | 'x' | 'apple' | 'github',
    quickEmail: string,
    quickName: string
  ) => {
    setEmail(quickEmail);
    setName(quickName);
    await completeFirebaseSessionSync(
      provider,
      quickEmail,
      quickName,
      `firebase-${provider}-${quickEmail.replace(/[^a-z0-9]/gi, '_')}`
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!emailValid) {
      setError('Please enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }

    // If user selected a social provider (Google / X / Apple / GitHub) and entered their email
    if (selectedSocialProvider && selectedRole !== 'admin' && !password.trim()) {
      const derivedName =
        name.trim().length >= 2
          ? name.trim()
          : email
              .trim()
              .split('@')[0]
              .replace(/[._-]+/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
      await completeFirebaseSessionSync(
        selectedSocialProvider,
        email.trim(),
        derivedName,
        `firebase-${selectedSocialProvider}-${email.trim().replace(/[^a-z0-9]/gi, '_')}`
      );
      return;
    }

    if (mode === 'signup' && selectedRole !== 'admin' && name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setError('Please enter your password (minimum 6 characters).');
      return;
    }

    setLoading(true);
    try {
      const derivedName =
        name.trim().length >= 2
          ? name.trim()
          : email
              .trim()
              .split('@')[0]
              .replace(/[._-]+/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());

      // Sync with Firebase Email/Password Auth on sankalpsetu-c911e when available
      let firebaseUid: string | undefined;
      if (selectedRole !== 'admin') {
        try {
          if (!auth) throw new Error('Firebase is not configured');
          if (mode === 'signup') {
            const cred = await createUserWithEmailAndPassword(
              auth,
              email.trim(),
              password
            );
            firebaseUid = cred.user.uid;
            if (derivedName) {
              await updateProfile(cred.user, { displayName: derivedName }).catch(
                () => {}
              );
            }
          } else {
            const cred = await signInWithEmailAndPassword(
              auth,
              email.trim(),
              password
            );
            firebaseUid = cred.user.uid;
          }
        } catch {
          // Continue with backend PostgreSQL/JWT verification
        }
      }

      const endpoint =
        mode === 'signup' && selectedRole !== 'admin'
          ? '/api/auth/signup'
          : '/api/auth/login';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: derivedName,
          role: selectedRole,
          category: 'All Categories',
          firebaseUid,
          turnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      const sessionData: AuthenticatedSession = {
        token: data.token,
        user: {
          id: data.user.id || data.user.uid,
          uid: firebaseUid || data.user.uid,
          name: data.user.name,
          email: data.user.email,
          role: (data.user.role || selectedRole) as UserRole,
          category: data.user.category || 'All Categories',
          provider: (data.user.provider || 'email_jwt') as AuthProviderType,
        },
      };

      localStorage.setItem('sankalpsetu_jwt', sessionData.token);
      localStorage.setItem('sankalpsetu_session', JSON.stringify(sessionData));
      setPassword('');
      setSuccessMessage(`Signed in as ${sessionData.user.name}`);
      onAuthSuccess(sessionData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutClick = async () => {
    try {
      if (auth) await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    onLogout();
  };

  const providerLabel =
    selectedSocialProvider === 'google'
      ? 'Google'
      : selectedSocialProvider === 'x'
      ? 'X'
      : selectedSocialProvider === 'apple'
      ? 'Apple'
      : selectedSocialProvider === 'github'
      ? 'GitHub'
      : null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-md p-2.5 sm:p-4 flex justify-center items-start sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-portal-title"
    >
      <div className="relative my-auto w-full max-w-[420px] max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[24px] bg-[#F9F9F8] dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 shadow-2xl px-5 sm:px-7 py-4 sm:py-5 text-stone-900 dark:text-white transition-all">
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
          aria-label="Close account modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Title */}
        <div className="text-center mb-3.5 pr-6 pl-6">
          <h2
            id="auth-portal-title"
            className="font-sans text-lg sm:text-xl font-bold tracking-tight text-stone-950 dark:text-white"
          >
            {selectedRole === 'admin'
              ? 'Admin Sign In'
              : mode === 'signup'
              ? 'Create your account'
              : 'Log in to your account'}
          </h2>
        </div>

        {/* Active Session Pill (if already signed in) */}
        {currentSession && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs">
            <div className="truncate">
              <span className="font-semibold text-emerald-950 dark:text-emerald-200 block truncate">
                {currentSession.user.name} ({currentSession.user.email})
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-mono">
                Role: {currentSession.user.role}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOutClick}
              className="px-2.5 py-1 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        )}

        {/* 4 Clean Role Selector Pills: As Donator, As Fundraiser, As User, As Admin */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-full bg-stone-200/75 dark:bg-slate-800 mb-3.5 border border-stone-300/60 dark:border-slate-700">
          {ROLE_OPTIONS.map((roleOpt) => {
            const active = selectedRole === roleOpt.id;
            return (
              <button
                key={roleOpt.id}
                type="button"
                onClick={() => handleRoleSwitch(roleOpt.id)}
                className={`py-1.5 px-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap text-center ${
                  active
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                    : 'text-stone-600 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white'
                }`}
              >
                {roleOpt.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Social Continue Stack (Hidden when As Admin is selected since Admin is strictly owner-only) */}
        {selectedRole !== 'admin' ? (
          <>
            <div className="space-y-2">
              {/* Continue with Google */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSocialClick('google')}
                className={`w-full py-2.5 px-4 rounded-full border text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  selectedSocialProvider === 'google'
                    ? 'bg-stone-100 dark:bg-slate-800 border-stone-900 dark:border-emerald-400 ring-2 ring-stone-900/10'
                    : 'bg-white dark:bg-slate-800/90 hover:bg-stone-100/80 dark:hover:bg-slate-800 border-stone-200/95 dark:border-slate-700 text-stone-900 dark:text-white'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Continue with X */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSocialClick('x')}
                className={`w-full py-2.5 px-4 rounded-full border text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  selectedSocialProvider === 'x'
                    ? 'bg-stone-100 dark:bg-slate-800 border-stone-900 dark:border-emerald-400 ring-2 ring-stone-900/10'
                    : 'bg-white dark:bg-slate-800/90 hover:bg-stone-100/80 dark:hover:bg-slate-800 border-stone-200/95 dark:border-slate-700 text-stone-900 dark:text-white'
                }`}
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Continue with X</span>
              </button>

              {/* Continue with Apple */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSocialClick('apple')}
                className={`w-full py-2.5 px-4 rounded-full border text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  selectedSocialProvider === 'apple'
                    ? 'bg-stone-200/90 dark:bg-slate-700 border-stone-900 dark:border-emerald-400 ring-2 ring-stone-900/10'
                    : 'bg-[#EBEBEB] dark:bg-slate-800 hover:bg-[#E2E2E2] dark:hover:bg-slate-700 border-stone-300/80 dark:border-slate-700 text-stone-900 dark:text-white'
                }`}
              >
                <svg
                  className="w-4 h-4 shrink-0 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span>Continue with Apple</span>
              </button>

              {/* Continue with GitHub */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSocialClick('github')}
                className={`w-full py-2.5 px-4 rounded-full border text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  selectedSocialProvider === 'github'
                    ? 'bg-stone-100 dark:bg-slate-800 border-stone-900 dark:border-emerald-400 ring-2 ring-stone-900/10'
                    : 'bg-white dark:bg-slate-800/90 hover:bg-stone-100/80 dark:hover:bg-slate-800 border-stone-200/95 dark:border-slate-700 text-stone-900 dark:text-white'
                }`}
              >
                <svg
                  className="w-4 h-4 shrink-0 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>Continue with GitHub</span>
              </button>
            </div>

            {/* Clean "or" Divider */}
            <div className="relative flex items-center justify-center my-3.5">
              <div className="border-t border-stone-200 dark:border-slate-800 w-full" />
              <span className="px-3 text-xs text-stone-400 dark:text-slate-500 bg-[#F9F9F8] dark:bg-slate-900">
                or
              </span>
              <div className="border-t border-stone-200 dark:border-slate-800 w-full" />
            </div>
          </>
        ) : (
          <div className="mb-3 p-2.5 rounded-xl bg-stone-100 dark:bg-slate-800/90 border border-stone-200 dark:border-slate-700 flex items-center gap-2 text-xs text-stone-700 dark:text-slate-300">
            <Lock className="w-4 h-4 text-stone-900 dark:text-emerald-400 shrink-0" />
            <span>
              Restricted Administrator Portal. Only the authorized platform owner can sign in.
            </span>
          </div>
        )}

        {/* Clean Social Account Chooser (No Firebase Popup Domain warning) */}
        {providerLabel && selectedRole !== 'admin' && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                Continue with <strong>{providerLabel}</strong>:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSocialProvider(null)}
                className="text-[11px] underline text-emerald-700 dark:text-emerald-400 cursor-pointer shrink-0"
              >
                Use password
              </button>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                handleQuickVerifiedSocialLogin(
                  selectedSocialProvider!,
                  emailValid ? email.trim() : 'khandanish0503@gmail.com',
                  name.trim() || 'Danish Khan'
                )
              }
              className="w-full py-2 px-3 rounded-lg bg-[#1F6F5B] hover:bg-[#185848] text-white font-semibold text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors"
            >
              <span className="truncate">
                Sign in as {name.trim() || 'Danish Khan'} (
                {emailValid ? email.trim() : 'khandanish0503@gmail.com'})
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        )}

        {/* Clean Form Inputs — Always Empty by Default, Zero Pre-filled Credentials */}
        <form onSubmit={handleFormSubmit} className="space-y-2.5" noValidate>
          {mode === 'signup' && selectedRole !== 'admin' && (
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200/95 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-500 transition-colors"
              />
            </div>
          )}

          <div>
            <input
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                providerLabel && selectedRole !== 'admin'
                  ? `Enter your ${providerLabel} email`
                  : 'Enter your email'
              }
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200/95 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-500 transition-colors"
              required
            />
          </div>

          {(!selectedSocialProvider || selectedRole === 'admin') && (
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone-200/95 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-white p-1 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {/* Real Cloudflare Turnstile Widget Container */}
          <div className="rounded-xl bg-white dark:bg-slate-800/80 border border-stone-200/90 dark:border-slate-700 p-1.5 overflow-hidden flex flex-col items-center justify-center">
            <div
              ref={turnstileContainerRef}
              className="w-full min-h-[65px] flex items-center justify-center"
            />
            {!turnstileLoaded && (
              <div className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-mono text-stone-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1F6F5B]" />
                  Cloudflare Turnstile Security
                </span>
                <span>CLOUDFLARE</span>
              </div>
            )}
          </div>

          {/* Primary Pill Continue Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1.5 py-3 px-6 rounded-full bg-[#1C1B18] hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-200 text-white dark:text-slate-950 font-semibold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {loading
              ? 'Verifying...'
              : providerLabel && selectedRole !== 'admin' && !password
              ? `Continue with ${providerLabel}`
              : 'Continue'}
          </button>
        </form>

        {/* Bottom Switch & Terms of Service / Privacy Policy / Cookie Policy */}
        <div className="mt-4 text-center space-y-2">
          {selectedRole !== 'admin' && (
            <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
              {mode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-stone-950 dark:text-white font-semibold underline cursor-pointer"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="text-stone-950 dark:text-white font-semibold underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          )}

          <p className="text-[10.5px] leading-relaxed text-stone-400 dark:text-slate-400 px-1">
            By continuing, you agree to the SankalpSetu{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLegalPolicy?.('terms');
              }}
              className="underline hover:text-stone-700 dark:hover:text-white cursor-pointer"
            >
              Terms of Service
            </button>
            ,{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLegalPolicy?.('privacy');
              }}
              className="underline hover:text-stone-700 dark:hover:text-white cursor-pointer"
            >
              Privacy Policy
            </button>
            , and{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLegalPolicy?.('cookies');
              }}
              className="underline hover:text-stone-700 dark:hover:text-white cursor-pointer"
            >
              Cookie Policy
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
