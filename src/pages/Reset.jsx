import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PublicPage } from '../components/PublicShell.jsx';
import { Err } from '../components/ui.jsx';
import { api } from '../lib/api';
export function Forgot() {
  const [email, setEmail] = useState(''); const [done, setDone] = useState(false); const [err, setErr] = useState('');
  const go = async (e) => { e.preventDefault(); try { await api('/auth/forgot', { method: 'POST', body: { email } }); setDone(true); } catch (x) { setErr(x.message); } };
  return <PublicPage><div className="grid place-items-center px-4 py-10"><form onSubmit={go} className="card w-full max-w-sm space-y-3"><h1 className="text-2xl font-bold">Reset password</h1>
    {done ? <p className="text-ok text-sm">If that email has an account, a reset link is on its way.</p> : <><input type="email" className="input" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} /><Err>{err}</Err><button className="btn-primary w-full">Send reset link</button></>}<Link to="/login" className="text-sm text-violet-light block text-center">Back to log in</Link></form></div></PublicPage>;
}
export function Reset() {
  const [q] = useSearchParams(); const [pw, setPw] = useState(''); const [done, setDone] = useState(false); const [err, setErr] = useState('');
  const go = async (e) => { e.preventDefault(); try { await api('/auth/reset', { method: 'POST', body: { token: q.get('token') || '', password: pw } }); setDone(true); } catch (x) { setErr(x.message); } };
  return <PublicPage><div className="grid place-items-center px-4 py-10"><form onSubmit={go} className="card w-full max-w-sm space-y-3"><h1 className="text-2xl font-bold">Choose a new password</h1>
    {done ? <><p className="text-ok text-sm">Password updated.</p><Link to="/login" className="btn-primary w-full">Log in</Link></> : <><input type="password" minLength={8} className="input" placeholder="New password (8+ characters)" required value={pw} onChange={(e) => setPw(e.target.value)} /><Err>{err}</Err><button className="btn-primary w-full">Update password</button></>}</form></div></PublicPage>;
}
