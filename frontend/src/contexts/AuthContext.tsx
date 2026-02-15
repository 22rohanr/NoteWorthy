import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiPost } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** The subset of user-profile fields returned by the backend. */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  preferences: {
    favoriteNotes: string[];
    favoriteConcentrations: string[];
    favoriteOccasions: string[];
  };
  collection: {
    owned: string[];
    wishlist: string[];
    tried: string[];
  };
  joinDate: string;
}

export interface AuthContextValue {
  /** The raw Firebase Auth user (null when logged out). */
  firebaseUser: FirebaseUser | null;
  /** The Firestore user profile synced from the backend. */
  userProfile: UserProfile | null;
  /** The latest Firebase ID token (refreshed on every auth-state change). */
  idToken: string | null;
  /** True while onAuthStateChanged hasn't fired yet or a backend call is in-flight. */
  loading: boolean;
  /** Sign out of Firebase and clear all local state. */
  logout: () => Promise<void>;
  /** After a new Firebase user is created, call this to register them on the backend. */
  registerOnBackend: (idToken: string, username: string) => Promise<UserProfile>;
  /** Manually sync the profile from the backend (e.g. after login). */
  syncProfile: (idToken: string) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── backend helpers ─────────────────────────────────────────────── */

  const syncProfile = useCallback(async (token: string): Promise<UserProfile | null> => {
    try {
      const data = await apiPost<{ user: UserProfile }>("/auth/login", {
        idToken: token,
      });
      setUserProfile(data.user);
      return data.user;
    } catch {
      // 404 means the user has no Firestore profile yet – not an error.
      setUserProfile(null);
      return null;
    }
  }, []);

  const registerOnBackend = useCallback(
    async (token: string, username: string): Promise<UserProfile> => {
      const data = await apiPost<{ user: UserProfile }>("/auth/register", {
        idToken: token,
        username,
      });
      setUserProfile(data.user);
      return data.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setUserProfile(null);
    setIdToken(null);
  }, []);

  /* ── Firebase listener ───────────────────────────────────────────── */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          await syncProfile(token);
        } catch {
          setIdToken(null);
          setUserProfile(null);
        }
      } else {
        setIdToken(null);
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [syncProfile]);

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        idToken,
        loading,
        logout,
        registerOnBackend,
        syncProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
