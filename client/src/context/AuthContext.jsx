import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe } from "../api/auth";
import { setOnUnauthorized } from "../api/client";
import { clearAuth, getToken, getUser, saveAuth } from "../utils/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());
  const [token, setToken] = useState(() => getToken());

  const login = useCallback((nextToken, nextUser) => {
    saveAuth(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => logout());
    return () => setOnUnauthorized(null);
  }, [logout]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    getMe()
      .then((data) => {
        if (!cancelled && data.user) {
          saveAuth(token, data.user);
          setUser(data.user);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const updateUser = useCallback((nextUser) => {
    const currentToken = getToken();
    if (currentToken) {
      saveAuth(currentToken, nextUser);
    }
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoggedIn: Boolean(user && token),
      isAdmin: user?.role === "admin",
      login,
      logout,
      updateUser,
    }),
    [user, token, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
