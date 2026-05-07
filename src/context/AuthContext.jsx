import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getActiveUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../services/auth/localAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getActiveUser());

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === "english-platform-session") {
        setCurrentUser(getActiveUser());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      login: async (payload) => {
        const user = loginUser(payload.email, payload.password);
        setCurrentUser(user);
        return user;
      },
      register: async (payload) => {
        const user = registerUser(payload);
        setCurrentUser(user);
        return user;
      },
      logout: () => {
        logoutUser();
        setCurrentUser(null);
      },
    }),
    [currentUser]
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
