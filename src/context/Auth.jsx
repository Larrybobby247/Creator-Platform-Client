import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const qc = useQueryClient(); const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => api('/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false)), []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { qc.clear(); }, [user?.id]); // never let one account's cached data be visible to the next login
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); qc.clear(); };
  return <Ctx.Provider value={{ user, setUser, loading, refresh, logout }}>{children}</Ctx.Provider>;
}
