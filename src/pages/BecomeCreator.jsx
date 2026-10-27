import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ShieldCheck, Wallet, Sparkles, AlertTriangle, ChevronLeft } from 'lucide-react';
import { Err, Section } from '../components/ui.jsx';
import { api } from '../lib/api';
import { get } from '../lib/query.js';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';

const STEPS = ['Details', 'Guidelines', 'Your offers', 'Payout account'];
const PRICE_LABEL = { subscriptions: 'Monthly price (points)', specialRequests: 'Minimum price (points)', paidVoice: 'Default price per voice message (points)', innerCircle: 'Booking price (points)' };
const Sw = ({ on, onChange, label, hint }) => <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="w-full flex items-center justify-between gap-3 text-left"><span><b className="block text-sm">{label}</b>{hint && <span className="text-xs text-ink2">{hint}</span>}</span><span className={`relative w-11 h-6 rounded-full shrink-0 transition ${on ? 'bg-violet' : 'bg-card2 border border-line'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} /></span></button>;

export default function BecomeCreator() {
  const { user, refresh } = useAuth(); const nav = useNavigate(); const { toast } = useLive();
  const meta = useQuery({ queryKey: ['creator-meta'], queryFn: get('/creators/application/meta'), staleTime: 5 * 60_000 });
  const banksQ = useQuery({ queryKey: ['application-banks'], queryFn: get('/creators/application/banks'), staleTime: 6 * 3600_000 });
  const [step, setStep] = useState(-1); // -1 = explanation
  const [d, setD] = useState({ legalName: '', dob: '', phone: '' }); const [agree, setAgree] = useState(false);
  const [svc, setSvc] = useState({}); const [bank, setBank] = useState({ bankCode: '', accountNumber: '' }); const [holder, setHolder] = useState(null); const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { setHolder(null); setConfirmed(false); }, [bank.bankCode, bank.accountNumber]); // any change means the name must be checked again
  const bankName = banksQ.data?.banks.find((b) => b.code === bank.bankCode)?.name || '';
  const maxDob = useMemo(() => { const x = new Date(); x.setFullYear(x.getFullYear() - 18); return x.toISOString().slice(0, 10); }, []);
  if (user.accountMode === 'CREATOR') return <Navigate to="/studio" replace />;

  const detailsOk = d.legalName.trim().split(/\s+/).length >= 2 && d.legalName.trim().length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(d.dob) && d.dob <= maxDob && /^(\+234|0)[789][01]\d{8}$/.test(d.phone.replace(/[\s-]/g, ''));
  const priceMissing = (meta.data?.services || []).some((s) => s.priced && s.key !== 'specialRequests' && svc[s.key]?.enabled && !(Number(svc[s.key].pricePoints) >= 1));
  const verify = async () => { setBusy(true); setErr(''); setHolder(null); try { setHolder((await api('/creators/application/verify-account', { method: 'POST', body: bank })).accountName); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const finish = async () => { setBusy(true); setErr('');
    try { const services = Object.fromEntries((meta.data.services).map((s) => [s.key, { enabled: !!svc[s.key]?.enabled, ...(Number(svc[s.key]?.pricePoints) > 0 ? { pricePoints: Number(svc[s.key].pricePoints) } : {}) }]));
      await api('/creators/apply', { method: 'POST', body: { contentCategory: 'Personal content', country: 'Nigeria', legalName: d.legalName.trim(), dob: d.dob, phone: d.phone, acceptGuidelines: true, guidelinesVersion: meta.data.guidelinesVersion, services, bank: { ...bank, bankName, confirmedName: holder } } });
      await refresh(); toast('You are now a creator 🎉'); nav('/studio'); } catch (e) { setErr(e.message); if (e.code === 'GUIDELINES_CHANGED') { setStep(1); setAgree(false); meta.refetch(); } } finally { setBusy(false); } };

  return <Section q={meta} height="h-64">{(m) => <div className="space-y-4">
    {step === -1 ? <div className="space-y-4 animate-rise">
      <h1 className="text-3xl font-bold">Become a creator</h1>
      <div className="card space-y-4"><p className="text-ink2 text-sm">Creators earn from what they share. Here is what it means:</p>
        <ul className="space-y-3 text-sm">
          <li className="flex gap-3"><Sparkles className="text-violet-light shrink-0" size={20} /><span><b>Sell your content your way.</b> Paid photos and videos, subscriptions, special requests, paid voice messages, tips and gifts. You choose which to switch on and you set every price.</span></li>
          <li className="flex gap-3"><Wallet className="text-violet-light shrink-0" size={20} /><span><b>Get paid to your bank.</b> The platform keeps {m.commissionBps / 100}% of each sale ({m.proCommissionBps / 100}% on Pro). Withdraw to your own verified bank account, one request a day, arriving in 24 to 48 hours.</span></li>
          <li className="flex gap-3"><ShieldCheck className="text-violet-light shrink-0" size={20} /><span><b>You agree to the rules.</b> Creators must be 18+, use their real details for verification (never shown to others) and follow the content guidelines.</span></li></ul></div>
      <button className="btn-primary w-full" onClick={() => setStep(0)}>Start creator application</button><Link to={`/u/${user.username}`} className="btn-ghost w-full">Not now</Link>
    </div> : <>
      <div className="flex items-center gap-2"><button className="btn-ghost !px-2" onClick={() => setStep(step === 0 ? -1 : step - 1)} aria-label="Back"><ChevronLeft size={18} /></button><h1 className="text-xl font-bold flex-1">Creator application</h1><span className="text-xs text-muted">Step {step + 1} of {STEPS.length}</span></div>
      <div className="flex gap-1.5" aria-hidden>{STEPS.map((s, i) => <i key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-gradient-to-r from-violet to-pink' : 'bg-card2'}`} />)}</div>
      <p className="text-sm font-semibold">{STEPS[step]}</p>

      {step === 0 && <div className="card space-y-3 animate-rise">
        <label className="block text-sm">Content category<select className="input mt-1" value="Personal content" disabled><option>Personal content</option></select></label>
        <label className="block text-sm">Country<input className="input mt-1" value="Nigeria" disabled /></label>
        <label className="block text-sm">Full legal name<input className="input mt-1" autoComplete="name" value={d.legalName} onChange={(e) => setD({ ...d, legalName: e.target.value })} placeholder="As on your ID or bank account" /><span className="text-xs text-muted">Private. Used only for verification and never shown to other users. Your public name stays the same.</span></label>
        <label className="block text-sm">Date of birth<input type="date" className="input mt-1" max={maxDob} value={d.dob} onChange={(e) => setD({ ...d, dob: e.target.value })} /><span className="text-xs text-muted">You must be 18 or older.</span></label>
        <label className="block text-sm">Phone number<input type="tel" inputMode="tel" autoComplete="tel" className="input mt-1" placeholder="0803 123 4567" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} /></label>
        <button className="btn-primary w-full" disabled={!detailsOk} onClick={() => setStep(1)}>Continue</button></div>}

      {step === 1 && <div className="space-y-3 animate-rise">
        <div className="space-y-2">{m.guidelines.map((g, i) => <div key={g.title} className="card !p-3"><p className="text-sm font-semibold">{i + 1}. {g.title}</p><p className="text-xs text-ink2 mt-0.5">{g.body}</p></div>)}</div>
        <label className="card !p-3 flex items-start gap-3 text-sm cursor-pointer"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I have read and agree to the content guidelines above.</label>
        <Err>{err}</Err><button className="btn-primary w-full" disabled={!agree} onClick={() => { setErr(''); setStep(2); }}>Agree and continue</button></div>}

      {step === 2 && <div className="space-y-3 animate-rise"><p className="text-sm text-ink2">Choose what you want to offer. You do not have to switch everything on; you can change this later in Settings.</p>
        {m.services.map((s) => { const v = svc[s.key] || { enabled: false, pricePoints: '' }; if (s.key === 'innerCircle') return <div key={s.key} className="card !p-3 opacity-80 space-y-1"><div className="flex items-center justify-between gap-3"><b className="text-sm">{s.label}</b><span aria-disabled="true" className="relative w-11 h-6 rounded-full bg-card2 border border-line cursor-not-allowed"><span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-muted" /></span></div><p className="text-xs text-ink2">Locked until your identity is verified. You can turn it on later in Settings after verification in Creator Studio.</p></div>; return <div key={s.key} className="card !p-3 space-y-2"><Sw label={s.label} on={v.enabled} onChange={(on) => setSvc({ ...svc, [s.key]: { ...v, enabled: on } })} hint={s.key === 'innerCircle' ? 'Goes live after identity verification in Creator Studio' : undefined} />
          {s.priced && v.enabled && <label className="block text-sm animate-rise">{PRICE_LABEL[s.key]}<input type="number" min={1} className="input mt-1" value={v.pricePoints} onChange={(e) => setSvc({ ...svc, [s.key]: { ...v, pricePoints: e.target.value } })} /></label>}</div>; })}
        <button className="btn-primary w-full" disabled={priceMissing} onClick={() => setStep(3)}>{Object.values(svc).some((x) => x.enabled) ? 'Continue' : 'Skip for now'}</button></div>}

      {step === 3 && <div className="space-y-3 animate-rise">
        <div className="card !border-warn/50 !bg-warn/10 flex gap-3 text-sm"><AlertTriangle className="text-warn shrink-0" size={20} /><p><b>Make sure this is correct.</b> Your earnings are sent to this account. If the details are wrong, your money can go to the wrong person and we cannot get it back.</p></div>
        <div className="card space-y-3"><label className="block text-sm">Bank<select className="input mt-1" value={bank.bankCode} onChange={(e) => setBank({ ...bank, bankCode: e.target.value })} disabled={banksQ.isPending}><option value="">{banksQ.isPending ? 'Loading banks…' : 'Select your bank…'}</option>{banksQ.data?.banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select></label>
          <label className="block text-sm">Account number<input className="input mt-1" inputMode="numeric" maxLength={10} placeholder="10 digits" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></label>
          {!holder && <button className="btn-ghost w-full" disabled={busy || !bank.bankCode || bank.accountNumber.length !== 10} onClick={verify}>{busy ? 'Checking with your bank…' : 'Verify account name'}</button>}
          {holder && <div className="rounded-btn bg-ok/10 border border-ok/40 p-3 space-y-2 animate-rise"><p className="text-xs text-ink2">{bankName} · ••••{bank.accountNumber.slice(-4)}</p><p className="font-bold flex items-center gap-2"><Check className="text-ok" size={18} />{holder}</p>
            <label className="flex items-start gap-3 text-sm cursor-pointer"><input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />This is my account and the name is correct.</label></div>}</div>
        <Err>{err}</Err>
        <button className="btn-primary w-full" disabled={busy || !holder || !confirmed} onClick={finish}>{busy ? 'Setting up your profile…' : 'Finish and set up my creator profile'}</button></div>}
    </>}
  </div>}</Section>;
}
