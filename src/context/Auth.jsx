import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from "react";

import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const Ctx = createContext(null);

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const qc = useQueryClient();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/auth/me");
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    qc.clear();
  }, [user?.id, qc]);

  const logout = async () => {
    try {
      // Ask the backend to expire the authentication cookie.
      await api("/auth/logout", {
        method: "POST"
      });
    } finally {
      // Always clear local authentication state.
      setUser(null);
      setLoading(false);
      qc.clear();
    }
  };

  return (
    <Ctx.Provider
      value={{
        user,
        setUser,
        loading,
        refresh,
        logout
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
