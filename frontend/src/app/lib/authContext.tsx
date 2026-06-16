import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DemoUser, RegisterUserInput, UserRole } from "./authModel";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  seedDemoUsers,
  updateCurrentUserWallet,
} from "./localAuth";

type AuthContextValue = {
  user: DemoUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => DemoUser;
  register: (input: RegisterUserInput) => DemoUser;
  logout: () => void;
  linkWallet: (address: string) => DemoUser;
};

type AuthProviderProps = {
  children: ReactNode;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toFriendlyAuthError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim()) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      seedDemoUsers();
      setUser(getCurrentUser());
    } catch (error) {
      setUser(null);
      console.error(toFriendlyAuthError(error, "Unable to restore your demo session."));
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const login = useCallback((email: string, password: string) => {
    try {
      const nextUser = loginUser(email, password);
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      throw toFriendlyAuthError(error, "Unable to sign in with those credentials.");
    }
  }, []);

  const register = useCallback((input: RegisterUserInput) => {
    try {
      const nextUser = registerUser(input);
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      throw toFriendlyAuthError(error, "Unable to create your demo voter account.");
    }
  }, []);

  const logout = useCallback(() => {
    try {
      logoutUser();
      setUser(null);
    } catch (error) {
      throw toFriendlyAuthError(error, "Unable to sign out of the demo session.");
    }
  }, []);

  const linkWallet = useCallback((address: string) => {
    try {
      const nextUser = updateCurrentUserWallet(address);
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      throw toFriendlyAuthError(error, "Unable to link this wallet to your demo account.");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      isInitialized,
      login,
      register,
      logout,
      linkWallet,
    }),
    [isInitialized, linkWallet, login, logout, register, user],
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
