import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Err } from '../components/ui.jsx';
import { api } from '../lib/api';
import { useLive } from '../context/Live.jsx';
const CATS = [['PAYMENT_DISPUTE', 'Payment or payout issue'], ['FRAUD', 'Fraud or scam'], ['HARASSMENT', 'Harassment'], ['IMPERSONATION', 'Impersonation'], ['INAPPROPRIATE_CONTENT', 'Inappropriate content'], ['SPAM', 'Spam'], ['SAFETY', 'Safety concern'], ['OTHER', 'Something else']];
// Report page. Links can prefill everything (?type=PAYOUT&id=…&category=PAYMENT_DISPUTE&reason=…), e.g. "Report a payout delay" in Creator Studio.
export default function Report() {
  const [sp] = useSearchParams(); const nav = useNavigate(); const { toast } = useLive();
  const type = sp.get('type') || 'USER'; const id = sp.get('id') || '';
  const [cat, setCat] = useState(CATS.some((c) => c[0] === sp.get('category')) ? sp.get('category') : 'OTHER'); const [reason, setReason] = useState(sp.get('reason') || ''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/report', { method: 'POST', body: { targetType: type, targetId: id, category: cat, reason } }); toast('Report sent. Our team will look into it.'); nav(-1); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  if (!id) return <div className="card text-sm text-ink2 space-y-3"><p>Open this page from the item you want to report.</p><Link to="/home" className="btn-primary">Back home</Link></div>;
  return <form onSubmit={go} className="card space-y-4 max-w-xl"><h1 className="text-2xl font-bold">Report a problem</h1>
    <label className="block text-sm">What is this about?<select className="input mt-1" value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
    <label className="block text-sm">Details<textarea className="input mt-1 min-h-[160px]" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required minLength={3} /></label>
    <p className="text-xs text-muted">We filled in the details for you. Add anything else that helps us.</p><Err>{err}</Err>
    <div className="flex gap-2"><button type="button" className="btn-ghost flex-1" onClick={() => nav(-1)}>Cancel</button><button className="btn-primary flex-1" disabled={busy || reason.trim().length < 3}>{busy ? 'Sending…' : 'Send report'}</button></div></form>;
}
