import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';

/**
 * Remembers across launches whether the last known session was signed in, so
 * the UI can optimistically show the app immediately (from local data) instead
 * of blocking on the slow first `onAuthStateChanged` round-trip. This is only a
 * UX hint — the real auth state still decides reads/writes.
 */
const AUTH_HINT_KEY = 'chalet:auth';

function readAuthHint(): boolean {
  try {
    return localStorage.getItem(AUTH_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeAuthHint(signedIn: boolean): void {
  try {
    if (signedIn) {
      localStorage.setItem(AUTH_HINT_KEY, '1');
    } else {
      localStorage.removeItem(AUTH_HINT_KEY);
    }
  } catch {
    // Ignore storage failures (private mode, quota); the hint is best-effort.
  }
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  /** True if the previous session was signed in (used to skip the loader). */
  knownSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Optimistic hint from the previous launch; lets us render the app right away
  // for returning users instead of showing the loading screen.
  const [knownSignedIn] = useState<boolean>(readAuthHint);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    // Keep the user signed in across reloads / app restarts.
    void setPersistence(auth, browserLocalPersistence);
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
      writeAuthHint(Boolean(next));
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      knownSignedIn,
      signIn: async (email, password) => {
        if (!auth) {
          throw new Error('Authentication is not configured.');
        }
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signInWithGoogle: async () => {
        if (!auth) {
          throw new Error('Authentication is not configured.');
        }
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      },
      logOut: async () => {
        if (auth) {
          await signOut(auth);
        }
      },
    }),
    [user, loading, knownSignedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
