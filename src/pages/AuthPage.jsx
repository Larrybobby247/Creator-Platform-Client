import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { safeNext } from '../lib/next.js';
import { PublicPage } from '../components/PublicShell.jsx';
import { Err } from '../components/ui.jsx';
import { api } from '../lib/api';
import { ResendForm } from './VerifyEmail.jsx';
import { useAuth } from '../context/Auth.jsx';

function Toggle({ on, onChange, children }) {
  return <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative mt-0.5 w-11 h-6 rounded-full transition shrink-0 ${on ? 'bg-violet' : 'bg-card2 border border-line'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} /></button>
    <span className="text-ink2">{children}</span></label>;
}

export default function AuthPage({ mode }) {
  const { setUser } = useAuth(); const nav = useNavigate(); const [q] = useSearchParams();
  const signup = mode === 'signup';
  const [f, setF] = useState({}); const [terms, setTerms] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); const [mailFailed, setMailFailed] = useState(false); const [unverified, setUnverified] = useState(null); const [cfg, setCfg] = useState(null); const gRef = useRef(); const termsRef = useRef(false); termsRef.current = terms;
  const ref = q.get('ref') || localStorage.getItem('ref') || undefined;
  useEffect(() => { if (q.get('ref')) localStorage.setItem('ref', q.get('ref')); }, []);
  useEffect(() => { api('/auth/config').then(setCfg).catch(() => {}); }, []);

  useEffect(() => { // Google Identity Services button
    if (!cfg?.googleClientId) return;
    const init = () => {
      window.google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: async ({ credential }) => {
        setErr('');
        try { const d = await api('/auth/google', { method: 'POST', body: { credential, acceptTerms: termsRef.current, ref } }); setUser(d.user); nav(safeNext(q.get('next'))); }
        catch (e) { setErr(e.message); } } });
      window.google.accounts.id.renderButton(gRef.current, { theme: 'filled_black', size: 'large', width: 320, text: signup ? 'signup_with' : 'signin_with' });
    };
    if (window.google?.accounts) return init();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = init; document.head.appendChild(s);
  }, [cfg, signup]);

  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr('');
    try { const d = await api(`/auth/${signup ? 'register' : 'login'}`, { method: 'POST', body: signup ? { ...f, acceptTerms: terms, ref } : f });
      if (d.pendingVerification) { setMailFailed(d.emailSent === false); return setPending(d.email); } // no session until the email is verified
      setUser(d.user); nav(safeNext(q.get('next'))); }
    catch (x) { if (x.code === 'EMAIL_NOT_VERIFIED') setUnverified(x.data?.email || f.email); setErr(x.message); } finally { setBusy(false); } };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const locked = signup && !terms;

  if (pending) return <PublicPage><div className="grid place-items-center px-4 py-10"><div className="card w-full max-w-sm space-y-4 text-center"><div className="text-5xl">📧</div><h1 className="text-2xl font-bold">Check your email</h1>
    {mailFailed && <p role="alert" className="text-warn text-sm">Your account was created, but the email could not be sent right now. Tap Resend below in a minute.</p>}<p className="text-ink2 text-sm">We sent a verification link to <b className="text-ink">{pending}</b>. Open it to activate your account, then log in. The link works for 24 hours.</p><ResendForm initialEmail={pending} /><Link to="/login" className="btn-primary w-full">I've verified, log in</Link></div></div></PublicPage>;
  return <PublicPage><div className="grid place-items-center px-4 py-10"><div className="card w-full max-w-sm space-y-4">
    <h1 className="text-2xl font-bold">{signup ? 'Create your account' : 'Welcome back'}</h1>
    {signup && <Toggle on={terms} onChange={setTerms}>I am 18+ and agree to the <Link to="/terms" target="_blank" className="text-violet-light underline">Terms</Link> and <Link to="/privacy" target="_blank" className="text-violet-light underline">Privacy Policy</Link>.</Toggle>}
    <div className={locked ? 'opacity-40 pointer-events-none' : ''} aria-disabled={locked}>
      {cfg?.googleClientId ? <div ref={gRef} className="grid place-items-center min-h-[44px]" /> : <button type="button" disabled className="btn-ghost w-full" title="Set GOOGLE_CLIENT_ID on the server">Continue with Google (not configured)</button>}
    </div>
    <div className="flex items-center gap-3 text-xs text-muted"><i className="flex-1 h-px bg-line" />or<i className="flex-1 h-px bg-line" /></div>
    <form onSubmit={submit} className="space-y-3">
      {signup && <div className="grid grid-cols-2 gap-2"><label className="block text-sm">Gender <span className="text-muted">(optional)</span><select className="input mt-1" defaultValue="" onChange={(e) => setF({ ...f, gender: e.target.value || undefined })}><option value="">Prefer not to say</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></label><label className="block text-sm">Age <span className="text-muted">(optional)</span><input type="number" min={18} max={120} className="input mt-1" placeholder="18+" onChange={(e) => setF({ ...f, age: e.target.value ? Number(e.target.value) : undefined })} /></label></div>}
      {signup && <label className="block text-sm">Username<input className="input mt-1" required minLength={3} pattern="[A-Za-z0-9_]+" onChange={set('username')} /></label>}
      <label className="block text-sm">Email<input type="email" className="input mt-1" required onChange={set('email')} /></label>
      <label className="block text-sm">Password<input type="password" minLength={8} className="input mt-1" required onChange={set('password')} /></label>
      <Err>{err}</Err>
      {unverified && <ResendForm initialEmail={unverified} />}
      <button className="btn-primary w-full" disabled={busy || locked}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}</button>
      {locked && <p className="text-xs text-muted">Turn on the switch above to enable sign up.</p>}
    </form>
    {!signup && <p className="text-sm text-center"><Link to="/forgot" className="text-violet-light">Forgot password?</Link></p>}
    <p className="text-sm text-ink2 text-center">{signup ? <>Have an account? <Link to="/login" className="text-violet-light">Log in</Link></> : <>New here? <Link to="/signup" className="text-violet-light">Sign up</Link></>}</p>
  </div></div></PublicPage>;
}
