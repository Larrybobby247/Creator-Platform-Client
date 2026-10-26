import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './Auth.jsx';
import { get, keys } from '../lib/query.js';
import { API_BASE_URL } from '../lib/api.js';
const Ctx = createContext(null);
export const useLive = () => useContext(Ctx);

// One socket per session (socket.io-client is loaded only after login, keeping it out of the public pages' bundle).
export function LiveProvider({ children }) {
  const { user } = useAuth(); const qc = useQueryClient();
  const [socket, setSocket] = useState(null); const [toasts, setToasts] = useState([]); const [presence, setPresence] = useState({});
  const toast = useCallback((text, tone = 'info') => { const id = Math.random(); setToasts((t) => [...t.slice(-2), { id, text, tone }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000); }, []);
  const { data: counts } = useQuery({ queryKey: keys.counts, queryFn: get('/counts'), enabled: !!user, staleTime: 60_000 }); // ONE request for both badges
  const bump = useCallback((field, by) => qc.setQueryData(keys.counts, (c) => c ? { ...c, [field]: Math.max(0, c[field] + by) } : c), [qc]);

  useEffect(() => { const f = () => qc.invalidateQueries({ queryKey: keys.wallet }); window.addEventListener('wallet:changed', f); return () => window.removeEventListener('wallet:changed', f); }, [qc]);
  useEffect(() => {
    if (!user) { setSocket(null); return; }
    let s, dead = false;
    import('socket.io-client').then(({ io }) => {
      if (dead) return; // In production the API lives on another host than the website, so the socket must connect to the API host (this is why chats only updated after reopening them).
      s = io(API_BASE_URL || undefined, { withCredentials: true, transports: ['websocket', 'polling'], reconnection: true }); setSocket(s);
      s.on('connect', () => qc.invalidateQueries({ queryKey: ['conversations'] }));
      s.on('presence', ({ userId, online }) => setPresence((p) => ({ ...p, [userId]: online })));
      s.on('message:new', (e) => { if (e.message.senderId !== user.id) { bump('messages', 1); if (!location.pathname.startsWith('/messages')) toast('New message', 'msg'); } qc.invalidateQueries({ queryKey: ['conversations'] }); });
      s.on('notification:new', (n) => { bump('notifications', 1); toast(n.text); qc.invalidateQueries({ queryKey: keys.wallet }); qc.invalidateQueries({ queryKey: keys.notifications }); });
    });
    return () => { dead = true; s?.close(); };
  }, [user?.id]);

  const value = useMemo(() => ({ socket, presence, msgUnread: counts?.messages || 0, notifUnread: counts?.notifications || 0, toast,
    refreshCounts: () => qc.invalidateQueries({ queryKey: keys.counts }), setNotifUnread: (n) => qc.setQueryData(keys.counts, (c) => c ? { ...c, notifications: n } : c) }), [socket, presence, counts, toast, qc]);
  return <Ctx.Provider value={value}>{children}
    <div className="fixed top-3 inset-x-3 z-50 flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className="pointer-events-auto bg-card2 border border-line rounded-btn px-4 py-3 text-sm shadow-lg max-w-sm w-full animate-[slide_.25s_ease-out]">{t.text}</div>)}</div></Ctx.Provider>;
}
