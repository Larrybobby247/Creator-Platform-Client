import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicPage } from '../components/PublicShell.jsx';
import { Err } from '../components/ui.jsx';
import { api } from '../lib/api';

export function ResendForm({ initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail); const [left, setLeft] = useState(0); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(t); }, [left]);
  const go = async (e) => { e.preventDefault(); setBusy(true); setMsg(''); try { await api('/auth/resend-verification', { method: 'POST', body: { email } }); setMsg('If that account needs verification, a new link is on its way.'); setLeft(60); } catch (x) { setMsg(x.message); } finally { setBusy(false); } };
  return <form onSubmit={go} className="space-y-2">{!initialEmail && <input type="email" className="input" placeholder="Your email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
    <button className="btn-ghost w-full" disabled={busy || left > 0 || !email}>{busy ? 'Sending…' : left > 0 ? `Resend available in ${left}s` : 'Resend verification email'}</button>{msg && <p className="text-xs text-ink2" role="status">{msg}</p>}</form>;
}

export default function VerifyEmail() {
  const [q] = useSearchParams(); const token = q.get('token') || ''; const [state, setState] = useState(token ? 'verifying' : 'missing'); const [err, setErr] = useState(''); const ran = useRef(false);
  useEffect(() => { if (!token || ran.current) return; ran.current = true; // StrictMode-safe: the link is single-use
    api('/auth/verify-email', { method: 'POST', body: { token } }).then(() => setState('done')).catch((e) => { setErr(e.message); setState('error'); }); }, [token]);
  return <PublicPage><div className="grid place-items-center px-4 py-10"><div className="card w-full max-w-sm space-y-4 text-center">
    {state === 'verifying' && <><h1 className="text-2xl font-bold">Verifying…</h1><div className="h-2 rounded bg-card2 overflow-hidden"><div className="h-full w-1/2 bg-violet animate-pulse" /></div></>}
    {state === 'done' && <><div className="text-5xl">✅</div><h1 className="text-2xl font-bold">Email verified</h1><p className="text-ink2 text-sm">Your account is active. You can log in now.</p><Link to="/login" className="btn-primary w-full">Log in</Link></>}
    {(state === 'error' || state === 'missing') && <><h1 className="text-2xl font-bold">Link problem</h1><Err>{state === 'missing' ? 'This link is incomplete.' : err}</Err><ResendForm /><Link to="/login" className="text-sm text-violet-light block">Back to log in</Link></>}
  </div></div></PublicPage>;
}
