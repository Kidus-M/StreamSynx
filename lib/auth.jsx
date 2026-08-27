import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext({ user: null, loading: true });

/**
 * Single subscription to Firebase auth for the whole app.
 * Pages read `user` from context instead of `auth.currentUser`, which is null
 * on the first render and used to make signed-in users flash "Log In Required".
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });
    return unsubscribe;
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Path to send a guest to, preserving where they were headed. */
export function loginHref(returnTo) {
  if (!returnTo || returnTo === "/login" || returnTo === "/signup") return "/login";
  return `/login?next=${encodeURIComponent(returnTo)}`;
}

/** Where to land after signing in: `?next=` only when it is a safe internal path. */
export function safeNext(next) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/** Redirects guests to the login page once auth has resolved. */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && router.isReady) {
      router.replace(loginHref(router.asPath));
    }
  }, [user, loading, router]);

  return { user, loading };
}
