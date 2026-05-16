import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { logger } from "../utils/logger";
import {
  assertSupabaseConfig,
  hasSupabaseConfig,
  supabase,
  SUPABASE_ENV_ERROR_MESSAGE,
} from "../lib/supabaseClient";

const AuthContext = createContext(null);
const profileCache = new Map();
const profileRequests = new Map();

function normalizeProfile(profile, authUser = null) {
  if (!profile && !authUser) {
    return null;
  }

  const metadata = authUser?.user_metadata || {};
  const fullName =
    profile?.full_name || metadata.full_name || metadata.fullname || "";
  const email = profile?.email || authUser?.email || "";

  return {
    id: profile?.id || authUser?.id,
    full_name: fullName,
    fullname: fullName,
    email,
    role: profile?.role || metadata.role || "student",
    createdAt: profile?.created_at || authUser?.created_at || "",
  };
}

async function fetchProfile(user, options = {}) {
  if (!user) {
    return null;
  }

  assertSupabaseConfig();
  const force = Boolean(options.force);

  if (!force && profileCache.has(user.id)) {
    logger.info("[auth] profile cache hit", { userId: user.id });
    return normalizeProfile(profileCache.get(user.id), user);
  }

  if (!force && profileRequests.has(user.id)) {
    logger.info("[auth] profile request deduped", { userId: user.id });
    return profileRequests.get(user.id);
  }

  logger.info("[auth] profile fetch started", { userId: user.id });
  const request = fetchProfileFromSupabase(user)
    .then((profile) => {
      profileCache.set(user.id, profile);
      logger.info("[auth] profile fetch finished", { userId: user.id });
      return profile;
    })
    .finally(() => {
      profileRequests.delete(user.id);
    });

  profileRequests.set(user.id, request);
  return request;
}

async function fetchProfileFromSupabase(user) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return normalizeProfile(data, user);
  }

  const fallbackProfile = {
    id: user.id,
    full_name:
      user.user_metadata?.full_name || user.user_metadata?.fullname || "",
    email: user.email,
    role: user.user_metadata?.role || "student",
  };

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert(fallbackProfile)
    .select("id,full_name,email,role,created_at")
    .single();

  if (insertError) {
    throw insertError;
  }

  return normalizeProfile(insertedProfile, user);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(
    hasSupabaseConfig ? "" : SUPABASE_ENV_ERROR_MESSAGE
  );

  const loadSession = useCallback(async () => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError("");

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      const activeSession = data.session || null;
      setSession(activeSession);
      setUser(activeSession?.user || null);
      setProfile(
        activeSession?.user ? await fetchProfile(activeSession.user) : null
      );
    } catch (error) {
      setAuthError(error.message);
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!hasSupabaseConfig) {
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const initStartedAt = Date.now();
    logger.info("[auth] initial session request started");

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
        setLoading(false);
        return;
      }

      const activeSession = data.session || null;
      setSession(activeSession);
      setUser(activeSession?.user || null);

      try {
        const nextProfile = activeSession?.user
          ? await fetchProfile(activeSession.user)
          : null;

        if (!isMounted) {
          return;
        }

        setProfile(nextProfile);
        setAuthError("");
      } catch (profileError) {
        if (isMounted) {
          setAuthError(profileError.message);
        }
      } finally {
        if (isMounted) {
          logger.info("[auth] initial session request finished", {
            elapsedMs: Date.now() - initStartedAt,
          });
          setLoading(false);
        }
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!isMounted) {
          return;
        }

        logger.info("[auth] state changed", {
          event: _event,
          hasSession: Boolean(nextSession),
        });
        setSession(nextSession);
        setUser(nextSession?.user || null);

        try {
          const nextProfile = nextSession?.user
            ? await fetchProfile(nextSession.user)
            : null;

          if (!isMounted) {
            return;
          }

          setProfile(nextProfile);
          setAuthError("");
        } catch (profileError) {
          if (isMounted) {
            setProfile(null);
            setAuthError(profileError.message);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      currentUser: normalizeProfile(profile, user),
      session,
      loading,
      authError,
      isAuthenticated: Boolean(user && profile),
      refreshProfile: async () => {
        const nextProfile = await fetchProfile(user, { force: true });
        setProfile(nextProfile);
        return nextProfile;
      },
      login: async ({ email, password }) => {
        assertSupabaseConfig();

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          throw error;
        }

        const nextProfile = await fetchProfile(data.user);
        setSession(data.session);
        setUser(data.user);
        setProfile(nextProfile);
        return nextProfile;
      },
      register: async ({ fullname, full_name, email, password, role }) => {
        assertSupabaseConfig();

        const fullName = (full_name || fullname || "").trim();
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
            },
          },
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          return {
            email: normalizedEmail,
            full_name: fullName,
            fullname: fullName,
            role,
            needsEmailConfirmation: true,
          };
        }

        const profilePayload = {
          id: data.user.id,
          full_name: fullName,
          email: normalizedEmail,
          role,
        };

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(profilePayload, { onConflict: "id" });

        if (profileError) {
          throw profileError;
        }

        const nextProfile = await fetchProfile(data.user);
        setSession(data.session);
        setUser(data.user);
        setProfile(nextProfile);
        return nextProfile;
      },
      logout: async () => {
        if (hasSupabaseConfig) {
          await supabase.auth.signOut();
        }

        setSession(null);
        setUser(null);
        if (user?.id) {
          profileCache.delete(user.id);
        }

        setProfile(null);
      },
      reloadSession: loadSession,
    }),
    [authError, loadSession, loading, profile, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
