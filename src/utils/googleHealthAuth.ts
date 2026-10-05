import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/youtube.readonly',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const TOKEN_STORAGE_KEY = 'apex_ghealth_access_token_v1';
const TOKEN_EXPIRY_KEY = 'apex_ghealth_token_expiry_v1';
const USER_EMAIL_STORAGE_KEY = 'apex_ghealth_user_email_v1';

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    const exp = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
    if (saved && (!exp || Date.now() < exp)) {
      return saved;
    }
  } catch {}
  return null;
})();

function getSavedUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      localStorage.getItem(USER_EMAIL_STORAGE_KEY) ||
      auth.currentUser?.email ||
      'leeevans117@gmail.com'
    );
  } catch {
    return 'leeevans117@gmail.com';
  }
}

function saveUserEmail(email: string | null | undefined) {
  if (!email || typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
  } catch {}
}

function saveAccessToken(token: string, expiresInSeconds = 3500) {
  cachedAccessToken = token;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
  } catch {}
}

export function clearSavedAccessToken() {
  cachedAccessToken = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {}
}

// Dynamically load Google Identity Services (accounts.google.com/gsi/client)
let gsiScriptPromise: Promise<void> | null = null;
function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Identity Services script'))
      );
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

export const initGoogleHealthAuth = (
  onAuthSuccess?: (
    user: User | { displayName: string | null; email: string | null },
    token: string
  ) => void,
  onAuthFailure?: () => void
) => {
  loadGsiScript().catch(() => {});

  const currentValidToken = getGoogleHealthAccessToken();
  if (currentValidToken && onAuthSuccess) {
    onAuthSuccess(
      auth.currentUser || {
        displayName: getSavedUserEmail() || 'Google Health User',
        email: getSavedUserEmail(),
      },
      currentValidToken
    );
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user?.email) {
      saveUserEmail(user.email);
    }
    const validToken = getGoogleHealthAccessToken();
    if (user) {
      if (validToken) {
        if (onAuthSuccess) onAuthSuccess(user, validToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else if (validToken) {
      if (onAuthSuccess) {
        onAuthSuccess(
          {
            displayName: getSavedUserEmail() || 'Google Health User',
            email: getSavedUserEmail(),
          },
          validToken
        );
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Requests a Google OAuth 2.0 Access Token directly using Google Identity Services
 * (`google.accounts.oauth2.initTokenClient`) with the provisioned oAuthClientId.
 * When `forceConsent` is false (default for 1-click Sync), uses `prompt: ''` and `hint`
 * so Google re-authorizes silently with 1 click instead of asking you to sign in again.
 */
export const googleHealthSignIn = async (
  forceConsent = false
): Promise<{
  user: User | { displayName: string | null; email: string | null };
  accessToken: string;
  grantedFitnessScope: boolean;
} | null> => {
  try {
    isSigningIn = true;
    const hintEmail = getSavedUserEmail();

    const clientId = (firebaseConfig as any).oAuthClientId;
    if (clientId) {
      try {
        await loadGsiScript();
        const gsiOauth2 = (window as any).google?.accounts?.oauth2;
        if (gsiOauth2) {
          const tokenResponse: any = await new Promise((resolve, reject) => {
            const client = gsiOauth2.initTokenClient({
              client_id: clientId,
              scope: SCOPES.join(' '),
              include_granted_scopes: true,
              hint: hintEmail || undefined,
              prompt: forceConsent ? 'consent' : '',
              callback: (resp: any) => {
                if (resp.error) {
                  reject(new Error(resp.error_description || resp.error));
                  return;
                }
                resolve(resp);
              },
              error_callback: (err: any) => {
                reject(new Error(err?.message || 'Google popup closed or blocked'));
              },
            });
            client.requestAccessToken({
              prompt: forceConsent ? 'consent' : '',
              hint: hintEmail || undefined,
            });
          });

          if (tokenResponse?.access_token) {
            saveAccessToken(
              tokenResponse.access_token,
              Number(tokenResponse.expires_in) || 3500
            );
            if (auth.currentUser?.email) {
              saveUserEmail(auth.currentUser.email);
            }
            const grantedFitnessScope = gsiOauth2.hasGrantedAllScopes(
              tokenResponse,
              'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly'
            );

            return {
              user: auth.currentUser || {
                displayName: hintEmail || 'Google Health User',
                email: hintEmail,
              },
              accessToken: tokenResponse.access_token,
              grantedFitnessScope,
            };
          }
        }
      } catch (gsiErr: any) {
        throw gsiErr;
      }
    }

    // 2. Fallback to Firebase Auth signInWithPopup
    const freshProvider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => freshProvider.addScope(scope));
    const customParams: Record<string, string> = {
      prompt: forceConsent ? 'consent select_account' : 'none',
      include_granted_scopes: 'true',
    };
    if (hintEmail) {
      customParams.login_hint = hintEmail;
    }
    freshProvider.setCustomParameters(customParams);

    const result = await signInWithPopup(auth, freshProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google sign-in.');
    }

    if (result.user?.email) {
      saveUserEmail(result.user.email);
    }

    let grantedFitnessScope = true;
    try {
      const infoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(
          credential.accessToken
        )}`
      );
      if (infoRes.ok) {
        const infoData: any = await infoRes.json();
        const scopeStr = String(infoData.scope || '');
        grantedFitnessScope =
          scopeStr.includes('fitness.activity') || scopeStr.includes('googlehealth');
        if (infoData.email) {
          saveUserEmail(String(infoData.email));
        }
      }
    } catch {}

    saveAccessToken(credential.accessToken, 3500);
    return {
      user: result.user,
      accessToken: credential.accessToken,
      grantedFitnessScope,
    };
  } catch (error: any) {
    console.error('Google Health sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleHealthAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
      const exp = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
      if (saved && (!exp || Date.now() < exp)) {
        cachedAccessToken = saved;
        return saved;
      }
      if (exp && Date.now() >= exp) {
        clearSavedAccessToken();
        return null;
      }
    } catch {}
  }
  return cachedAccessToken;
};

/**
 * 1-Click Automated Token Helper:
 * Returns the active cached token immediately if still valid;
 * otherwise performs a fast 1-click silent token refresh (`prompt: ''` + `login_hint`)
 * so the user doesn't have to manually sign in every time.
 */
export const getOrRefreshGoogleHealthToken = async (): Promise<string | null> => {
  const existing = getGoogleHealthAccessToken();
  if (existing) return existing;
  const refreshed = await googleHealthSignIn(false);
  return refreshed?.accessToken || null;
};

export const getCurrentGoogleUser = (): User | null => {
  return auth.currentUser;
};

export const logoutGoogleHealth = async () => {
  await auth.signOut();
  clearSavedAccessToken();
};
