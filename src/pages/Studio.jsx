import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Donut, Skeleton, Empty, Err, Badge, Avatar, Section, ErrorState } from '../components/ui.jsx';
import { useConfirmSpend } from '../components/ConfirmSpend.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { Check, AlertTriangle, Clock } from 'lucide-react';
import { get } from '../lib/query.js';
import { Meetups, Requests } from './Lists.jsx';
import { api, fmtPoints, fmtNaira, uid } from '../lib/api';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';

const Stat = ({ l, v, sub }) => <div className="card !p-4"><p className="text-xs text-ink2">{l}</p><p className="text-2xl font-bold mt-1">{v}</p>{sub && <p className="text-[11px] text-muted">{sub}</p>}</div>;
const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function Overview() { // each block loads, fails and retries on its own
  const an = useQuery({ queryKey: ['studio', 'analytics'], queryFn: get('/studio/analytics'), staleTime: 60_000 });
  const ea = useQuery({ queryKey: ['studio', 'earnings'], queryFn: get('/studio/earnings'), staleTime: 30_000 });
  return <div className="space-y-4">
    <Section q={ea} height="h-24">{(e) => <div className="grid grid-cols-2 gap-3"><Stat l="Available to withdraw" v={fmtPoints(e.availableToWithdraw)} sub={fmtNaira(e.availableToWithdraw * e.nairaPerPoint)} /><Stat l="Pending earnings" v={fmtPoints(e.pendingEarnings)} /></div>}</Section>
    <Section q={an} height="h-56">{(a) => <><div className="grid grid-cols-2 gap-3"><Stat l="Followers" v={a.followers} /><Stat l="Profile views" v={a.profileViews} /><Stat l="Active subscribers" v={a.subscribers} /><Stat l="Gifts received" v={a.giftsReceived} /><Stat l="Rating" v={a.rating ? `★ ${a.rating.avg}` : '–'} sub={a.rating && `${a.rating.count} reviews`} /></div>
      <div className="card"><p className="text-sm text-ink2 mb-2">Earnings, last 7 days (points)</p><LineChart points={a.days.map((d) => ({ label: WD[new Date(d.date).getDay()], value: d.points }))} /></div></>}</Section></div>;
}

const STEPS_TEXT = ['A fan pays for your content or subscription.', 'The payment provider confirms the payment.', 'The platform fee is taken and your share is calculated.', 'Once eligible, your share moves to your available balance.', 'You add and verify your bank account (once).', 'You choose how much to withdraw (one request per day).', 'We send the transfer. You get a notification when it succeeds or fails.'];
function BankAccount({ info, onSaved }) {
  const { toast } = useLive(); const [edit, setEdit] = useState(!info.account); const banks = useQuery({ queryKey: ['studio', 'banks'], queryFn: get('/studio/banks'), staleTime: 6 * 3600_000, enabled: edit });
  const [f, setF] = useState({ bankCode: '', accountNumber: '' }); const [holder, setHolder] = useState(null); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { setHolder(null); setOk(false); }, [f.bankCode, f.accountNumber]);
  const bankName = banks.data?.banks.find((b) => b.code === f.bankCode)?.name || '';
  const verify = async () => { setBusy(true); setErr(''); try { setHolder((await api('/studio/payout-account/verify', { method: 'POST', body: f })).accountName); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const save = async () => { setBusy(true); setErr(''); try { await api('/studio/payout-account', { method: 'POST', body: { ...f, bankName, confirmedName: holder } }); toast('Bank account saved'); setEdit(false); onSaved(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  if (!edit) return <div className="card flex items-center gap-3"><div className="flex-1 min-w-0 text-sm"><p className="text-xs text-ink2">Payout account</p><p className="font-semibold truncate">{info.account.accountName}</p><p className="text-xs text-muted">{info.account.bankName} ••••{info.account.accountLast4}</p></div><button className="btn-ghost !py-2" onClick={() => setEdit(true)}>Change</button></div>;
  return <div className="card space-y-3"><h3 className="font-semibold">{info.account ? 'Change bank account' : 'Add your bank account'}</h3>
    <p className="text-xs text-warn flex gap-2"><AlertTriangle size={16} className="shrink-0" />Double-check the details. If they are wrong you can lose your money.</p>
    <select className="input" value={f.bankCode} onChange={(e) => setF({ ...f, bankCode: e.target.value })}><option value="">{banks.isPending ? 'Loading banks…' : 'Select your bank…'}</option>{banks.data?.banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select>
    <input className="input" inputMode="numeric" maxLength={10} placeholder="Account number (10 digits)" value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
    {!holder && <button className="btn-ghost w-full" disabled={busy || !f.bankCode || f.accountNumber.length !== 10} onClick={verify}>{busy ? 'Checking with your bank…' : 'Verify account name'}</button>}
    {holder && <div className="rounded-btn bg-ok/10 border border-ok/40 p-3 space-y-2 animate-rise"><p className="font-bold flex items-center gap-2"><Check size={16} className="text-ok" />{holder}</p><label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={ok} onChange={(e) => setOk(e.target.checked)} />This is my account and the name is correct.</label></div>}
    <Err>{err}</Err><div className="flex gap-2">{info.account && <button className="btn-ghost flex-1" onClick={() => setEdit(false)}>Cancel</button>}<button className="btn-primary flex-1" disabled={busy || !holder || !ok} onClick={save}>Save account</button></div></div>;
}
const delayReport = (p) => `/report?${new URLSearchParams({ type: 'PAYOUT', id: p._id, category: 'PAYMENT_DISPUTE', reason: `Payout delay\nReference: ${p.reference}\nAmount: ${fmtNaira(p.nairaAmount)}\nBank: ${p.bankName} ••••${p.accountLast4}\nRequested: ${new Date(p.createdAt).toLocaleString()}\nStatus: ${p.status}\n\nMy payout has not reached my account within 24 to 48 hours.` })}`;
function Earnings() {
  const { toast } = useLive(); const qc = useQueryClient(); const [e, setE] = useState(null); const [list, setList] = useState(null); const [amount, setAmount] = useState(5); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [steps, setSteps] = useState(false);
  const infoQ = useQuery({ queryKey: ['studio', 'payout-info'], queryFn: get('/studio/payout-info'), staleTime: 0 }); const info = infoQ.data;
  const load = () => { qc.invalidateQueries({ queryKey: ['studio'] }); api('/studio/earnings').then(setE); api('/studio/payouts').then((d) => setList(d.items)); }; useEffect(load, []);
  const go = async (ev) => { ev.preventDefault(); setErr(''); setBusy(true); try { const d = await api('/studio/payouts', { method: 'POST', body: { amountPoints: Number(amount) } }); toast(d.message); load(); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  if (!e || !info) return <Skeleton className="h-64" />;
  const blocked = info.requestedToday; const tooLow = Number(amount) < info.minPayoutPoints || Number(amount) > e.availableToWithdraw;
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><Stat l="Gross revenue" v={fmtPoints(e.gross)} /><Stat l="Platform fees" v={fmtPoints(e.platformFees)} /><Stat l="Available" v={fmtPoints(e.availableToWithdraw)} sub={fmtNaira(e.availableToWithdraw * e.nairaPerPoint)} /><Stat l="Paid out" v={fmtPoints(e.paidOut)} /><Stat l="Pending payouts" v={fmtPoints(e.pendingPayouts)} /><Stat l="Refunded" v={fmtPoints(e.refunded)} /></div>
    <div className="card !p-3"><button className="w-full flex justify-between text-sm font-semibold" onClick={() => setSteps(!steps)} aria-expanded={steps}>How withdrawals work<span className="text-ink2">{steps ? '–' : '+'}</span></button>{steps && <ol className="mt-3 space-y-1.5 text-sm text-ink2 list-decimal pl-5 animate-rise">{STEPS_TEXT.map((t) => <li key={t}>{t}</li>)}</ol>}</div>
    <BankAccount info={info} onSaved={() => infoQ.refetch()} />
    {info.account && <form onSubmit={go} className="card space-y-3"><h3 className="font-semibold">Request withdrawal</h3>
      <label className="block text-sm">Amount (points)<input className="input mt-1" type="number" min={info.minPayoutPoints} max={e.availableToWithdraw} value={amount} onChange={(x) => setAmount(x.target.value)} disabled={blocked} /><span className="text-xs text-muted">Minimum {info.minPayoutPoints} pts · you receive {fmtNaira(Number(amount || 0) * e.nairaPerPoint)}</span></label>
      <p className="text-xs text-ink2 flex gap-2"><Clock size={14} className="shrink-0 mt-0.5" />{info.eta} You can request one withdrawal per day.</p>
      {blocked && <p role="alert" className="text-sm text-warn">You have already requested a withdrawal today. You can request again tomorrow.</p>}
      <Err>{err}</Err><button className="btn-primary w-full" disabled={busy || blocked || tooLow}>{busy ? 'Requesting…' : `Withdraw ${fmtNaira(Number(amount || 0) * e.nairaPerPoint)}`}</button></form>}
    <h3 className="font-semibold">Payout history</h3>{!list ? <Skeleton /> : list.length === 0 ? <Empty>No payouts yet.</Empty> : list.map((p) => <div key={p._id} className="card !p-3 space-y-2 text-sm"><div className="flex justify-between"><span>{p.bankName} ••••{p.accountLast4}<br /><span className="text-xs text-muted">{p.reference} · {new Date(p.createdAt).toLocaleDateString()}</span></span><span className="text-right">{fmtNaira(p.nairaAmount)}<br /><span className={`text-xs ${p.status === 'PAID' ? 'text-ok' : p.status === 'FAILED' || p.status === 'REVERSED' ? 'text-bad' : 'text-warn'}`}>{p.status}</span></span></div>
      {p.status !== 'PAID' && <div className="flex items-center justify-between gap-2 text-xs text-ink2 border-t border-divider pt-2"><span>{p.status === 'FAILED' || p.status === 'REVERSED' ? 'Failed payouts return to your balance.' : 'Arrives in 24 to 48 hours.'}</span><Link to={delayReport(p)} className="chip border-line text-violet-light shrink-0">Report a delay</Link></div>}</div>)}</div>;
}

function Promotions() {
  const { toast } = useLive(); const [prices, setPrices] = useState(null); const [list, setList] = useState(null); const [posts, setPosts] = useState([]); const { user } = useAuth();
  const [f, setF] = useState({ targetType: 'PROFILE', targetId: '', duration: 'DAY1' }); const [err, setErr] = useState('');
  const load = () => api('/promotions/me').then((d) => setList(d.items));
  useEffect(() => { api('/promotions/prices').then(setPrices); load(); api(`/feed?author=${user.id}&access=PUBLIC`).then((d) => setPosts(d.posts)); }, []);
  const ask = useConfirmSpend();
  const buy = async () => { setErr(''); if (!(await ask({ title: 'Start this promotion?', detail: 'It will be shown as Sponsored. Results are not guaranteed.', points: prices[f.duration], confirmLabel: 'Promote' }))) return; try { await api('/promotions', { method: 'POST', body: { ...f, targetId: f.targetType === 'PROFILE' ? undefined : f.targetId, idempotencyKey: uid() } }); toast('Promotion started'); window.dispatchEvent(new Event('wallet:changed')); load(); } catch (e) { setErr(e.message); } };
  const label = { DAY1: '24 hours', DAY3: '3 days', DAY7: '7 days' };
  if (!prices) return <Skeleton className="h-48" />;
  return <div className="space-y-4"><div className="card space-y-3"><h3 className="font-semibold">Promote</h3><p className="text-xs text-muted">Promoted items are labelled Sponsored. Results are never guaranteed.</p>
    <select className="input" value={f.targetType} onChange={(e) => setF({ ...f, targetType: e.target.value, targetId: '' })}><option value="PROFILE">My profile</option><option value="POST">A public post</option></select>
    {f.targetType === 'POST' && <select className="input" value={f.targetId} onChange={(e) => setF({ ...f, targetId: e.target.value })}><option value="">Choose a post…</option>{posts.map((p) => <option key={p._id} value={p._id}>{(p.content || '').slice(0, 40)}</option>)}</select>}
    <div className="grid grid-cols-3 gap-2">{Object.keys(label).map((k) => <button key={k} onClick={() => setF({ ...f, duration: k })} className={`card !p-3 text-center ${f.duration === k ? '!border-violet' : ''}`}><p className="text-sm">{label[k]}</p><p className="font-bold">{prices[k]} pts</p></button>)}</div>
    <Err>{err}</Err><button className="btn-primary w-full" disabled={f.targetType === 'POST' && !f.targetId} onClick={buy}>Pay {prices[f.duration]} pts</button></div>
    {!list ? <Skeleton /> : list.length === 0 ? <Empty>No promotions yet.</Empty> : list.map((p) => <div key={p._id} className="card !p-3 text-sm flex justify-between"><span><b>{p.targetType}</b> · {label[p.duration]}<br /><span className="text-xs text-muted">{p.impressions} impressions · {p.clicks} clicks · ends {new Date(p.expiresAt).toLocaleDateString()}</span></span><Badge tone={p.status === 'ACTIVE' ? 'ok' : 'violet'}>{p.status}</Badge></div>)}</div>;
}

const BVN_ERR = { BVN_NOT_FOUND: 'We could not find that BVN. Check the number and try again.', BVN_MISMATCH: 'The details did not match this BVN record. Check your names and date of birth.', PROVIDER_TIMEOUT: 'Verification timed out. Nothing was counted against you; try again.', PROVIDER_UNAVAILABLE: 'Verification is temporarily unavailable. Please try again shortly.', RATE_LIMITED: 'Too many attempts. Please wait an hour.', TOO_MANY_FAILURES: 'Too many unsuccessful attempts today. Try again tomorrow or contact support.', BVN_IN_USE: 'This BVN cannot be used on this account.', IN_PROGRESS: 'A verification is already in progress.', PROVIDER_NOT_CONFIGURED: 'Verification is not available right now. Please try again later.' };
function BvnForm({ onDone }) {
  const [f, setF] = useState({ bvn: '', firstName: '', lastName: '', dob: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [fieldErr, setFieldErr] = useState('');
  const ok = /^\d{11}$/.test(f.bvn) && f.firstName.trim() && f.lastName.trim() && /^\d{4}-\d{2}-\d{2}$/.test(f.dob);
  const submit = async (e) => { e.preventDefault(); if (busy) return; setErr(''); setFieldErr(''); if (!/^\d{11}$/.test(f.bvn)) return setFieldErr('A BVN has exactly 11 digits.'); setBusy(true);
    try { await api('/studio/verification/start', { method: 'POST', body: f }); setF({ bvn: '', firstName: '', lastName: '', dob: '' }); onDone(); } // the BVN is cleared from memory right after sending
    catch (x) { setErr(BVN_ERR[x.code] || x.message); x.code === 'BVN_MISMATCH' || x.code === 'BVN_NOT_FOUND' ? setF((p) => ({ ...p, bvn: '' })) : null; if (typeof x.attemptsLeft === 'number') setErr((m) => `${m} (${x.attemptsLeft} attempt${x.attemptsLeft === 1 ? '' : 's'} left today)`); } finally { setBusy(false); } };
  const set = (k) => (e) => setF({ ...f, [k]: k === 'bvn' ? e.target.value.replace(/\D/g, '').slice(0, 11) : e.target.value });
  return <form onSubmit={submit} className="space-y-3" aria-busy={busy}>
    <label className="block text-sm">BVN (11 digits)<input className="input mt-1" inputMode="numeric" autoComplete="off" maxLength={11} value={f.bvn} onChange={set('bvn')} disabled={busy} aria-invalid={!!fieldErr} /></label>{fieldErr && <p role="alert" className="text-bad text-xs">{fieldErr}</p>}
    <div className="grid grid-cols-2 gap-2"><label className="block text-sm">First name<input className="input mt-1" autoComplete="given-name" value={f.firstName} onChange={set('firstName')} disabled={busy} /></label><label className="block text-sm">Last name<input className="input mt-1" autoComplete="family-name" value={f.lastName} onChange={set('lastName')} disabled={busy} /></label></div>
    <label className="block text-sm">Date of birth<input type="date" className="input mt-1" value={f.dob} onChange={set('dob')} disabled={busy} /></label>
    <p className="text-xs text-muted">Enter your names exactly as on your BVN. Your BVN is checked with our verification partner (Dojah) and is never stored or shown by us.</p>
    <Err>{err}</Err>
    <button className="btn-primary w-full" disabled={!ok || busy}>{busy ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Verifying with your bank records… up to 15s</> : 'Verify my identity'}</button></form>;
}

function MeetupSettings() {
  const { toast } = useLive(); const qc = useQueryClient(); const [err, setErr] = useState(''); const [m, setM] = useState({ pricePoints: 10, transportPoints: 0, durationMin: 60, area: '', noticeHours: 24, cancelRule: '' });
  const vq = useQuery({ queryKey: ['studio', 'verification'], queryFn: get('/studio/verification'), staleTime: 10_000 }); const v = vq.data;
  const done = () => { toast('Identity verified ✅'); qc.invalidateQueries({ queryKey: ['studio', 'verification'] }); };
  const save = async (enabled) => { setErr(''); try { await api('/creators/meetup', { method: 'PATCH', body: { ...m, pricePoints: Number(m.pricePoints), transportPoints: Number(m.transportPoints), durationMin: Number(m.durationMin), noticeHours: Number(m.noticeHours), enabled } }); toast(enabled ? 'Innercircle enabled' : 'Innercircle disabled'); } catch (e) { setErr(e.message); } };
  const set = (k) => (e) => setM({ ...m, [k]: e.target.value });
  return <div className="space-y-4"><Section q={vq} height="h-48">{() => <div className="card space-y-3"><div className="flex justify-between"><h3 className="font-semibold">Identity verification</h3><Badge tone={v.status === 'VERIFIED' ? 'ok' : 'violet'}>{v.status.replaceAll('_', ' ')}</Badge></div>
      {v.environment === 'sandbox' && <p className="text-xs text-warn">Test mode: Dojah sandbox. Use Dojah's sandbox test data; results are not real.</p>}
      {v.status === 'VERIFIED' ? <p className="text-sm text-ok">Your identity is verified. You can enable Innercircle below.</p> : v.status === 'REQUIRES_REVIEW' ? <p className="text-sm text-ink2">Your verification is being reviewed by our team.</p> : !v.providerConfigured ? <p className="text-warn text-sm">Verification is not available right now. Please try again later.</p> : <BvnForm onDone={done} />}</div>}</Section>
    <div className={`card space-y-3 ${v?.status !== 'VERIFIED' ? 'opacity-50 pointer-events-none' : ''}`}><h3 className="font-semibold">Innercircle settings</h3>
      {[['pricePoints', 'Innercircle fee (points)'], ['transportPoints', 'Invitation fee (points, separate)'], ['durationMin', 'Duration (minutes)'], ['noticeHours', 'Notice (hours)']].map(([k, l]) => <label key={k} className="block text-sm">{l}<input type="number" className="input mt-1" value={m[k]} onChange={set(k)} /></label>)}
      <input className="input" placeholder="Permitted meeting area" onChange={set('area')} /><textarea className="input" placeholder="Cancellation rules" onChange={set('cancelRule')} />
      <div className="flex gap-2"><button className="btn-primary flex-1" onClick={() => save(true)}>Enable</button><button className="btn-ghost flex-1" onClick={() => save(false)}>Disable</button></div></div><Err>{err}</Err>
    <h3 className="font-semibold">Innercircle booking requests</h3><Meetups asCreator /></div>;
}
function Posts() {
  const { toast } = useLive(); const confirm = useConfirm(); const [items, setItems] = useState(null); const load = () => api('/media/posts/mine').then((d) => setItems(d.items)); useEffect(() => { load(); }, []);
  const patch = async (id, body) => { try { await api(`/media/posts/${id}`, { method: 'PATCH', body }); load(); } catch (e) { toast(e.message); } };
  const del = async (id) => { if (!(await confirm({ title: 'Delete this post?', detail: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return; try { await api(`/media/posts/${id}`, { method: 'DELETE' }); load(); } catch (e) { toast(e.message); } };
  const edit = async (p) => { const t = await confirm({ title: 'Edit caption', confirmLabel: 'Save', input: { value: p.content || '', multiline: true, maxLength: 5000 } }); if (t !== null) patch(p._id, { content: t }); };
  const price = async (p, idx) => { const cur = idx === undefined ? p.unlockPricePoints : p.media[idx].pricePoints; const v = await confirm({ title: 'New unlock price (points)', detail: 'People who already unlocked it keep access.', confirmLabel: 'Save', input: { value: String(cur), type: 'number', min: 1 } }); if (v) patch(p._id, idx === undefined ? { unlockPricePoints: Number(v) } : { mediaPrices: [{ idx, pricePoints: Number(v) }] }); };
  if (!items) return <Skeleton className="h-40" />;
  return <div className="space-y-3"><Link to="/create" className="btn-primary w-full">+ New post</Link>{items.length === 0 ? <Empty>No posts yet.</Empty> : items.map((p) => <div key={p._id} className="card !p-3 space-y-2 text-sm"><div className="flex items-center gap-2 flex-wrap"><Badge tone={p.status === 'PUBLISHED' ? 'ok' : 'violet'}>{p.status}</Badge>{p.pinnedAt && <Badge tone="pink">PINNED</Badge>}
      {p.media?.length ? p.media.map((m, i) => <Badge key={i}>{m.mediaType === 'VIDEO' ? 'Video' : 'Photo'} · {m.access === 'PUBLIC' ? 'Free' : m.access === 'EXCLUSIVE' ? `${m.pricePoints} pts` : 'Subscribers'}</Badge>) : <Badge>{p.access}{p.access === 'EXCLUSIVE' ? ` · ${p.unlockPricePoints} pts` : ''}</Badge>}</div><p className="text-ink2 line-clamp-2">{p.content || '(no caption)'}</p>
    <div className="flex gap-3 text-xs flex-wrap"><button className="text-violet-light" onClick={() => edit(p)}>Edit</button>{p.access === 'EXCLUSIVE' && !p.media?.length && <button className="text-violet-light" onClick={() => price(p)}>Price</button>}{(p.media || []).map((m, i) => m.access === 'EXCLUSIVE' && <button key={i} className="text-violet-light" onClick={() => price(p, i)}>Price #{i + 1}</button>)}<button className="text-violet-light" onClick={() => patch(p._id, { status: p.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT' })}>{p.status === 'DRAFT' ? 'Publish' : 'Unpublish'}</button><button className="text-violet-light" onClick={async () => { try { const d = await api(`/media/posts/${p._id}/pin`, { method: 'POST' }); toast(d.pinned ? 'Pinned' : 'Unpinned'); load(); } catch (e) { toast(e.message); } }}>{p.pinnedAt ? 'Unpin' : 'Pin'}</button><button className="text-bad" onClick={() => del(p._id)}>Delete</button></div></div>)}</div>;
}
function Audience() {
  const [d, setD] = useState(null); useEffect(() => { api('/studio/audience').then(setD); }, []);
  if (!d) return <Skeleton className="h-40" />;
  const Row = ({ u, extra }) => <Link to={`/u/${u?.username}`} className="card !p-3 flex items-center gap-3 text-sm"><Avatar user={u} size={32} /><span className="flex-1">{u?.displayName || u?.username}</span>{extra}</Link>;
  return <div className="space-y-4"><div><h3 className="font-semibold mb-2">Subscribers ({d.subscribers.length})</h3><div className="space-y-2">{d.subscribers.length === 0 ? <Empty>No subscribers yet.</Empty> : d.subscribers.map((s, i) => <Row key={i} u={s.user} extra={<Badge tone={s.status === 'ACTIVE' ? 'ok' : 'violet'}>{s.status}</Badge>} />)}</div></div>
    <div><h3 className="font-semibold mb-2">Recent followers</h3><div className="space-y-2">{d.followers.length === 0 ? <Empty>No followers yet.</Empty> : d.followers.map((u) => <Row key={u._id} u={u} />)}</div></div></div>;
}
function GiftsTab() {
  const { user } = useAuth(); const [d, setD] = useState(null); useEffect(() => { api(`/creators/${user.id}/gifts`).then(setD); }, []);
  if (!d) return <Skeleton className="h-40" />;
  return <div className="space-y-3">{d.items.length === 0 ? <Empty>No gifts received yet.</Empty> : <div className="grid grid-cols-3 gap-2">{d.items.map((g) => <div key={g.gift?._id} className="card !p-3 text-center"><p className="text-sm font-semibold">{g.gift?.name}</p><p className="text-2xl font-bold">×{g.quantity}</p><p className="text-xs text-muted">{g.pointsSpent} pts</p></div>)}</div>}
    {d.recent && <><h3 className="font-semibold">Recent supporters</h3>{d.recent.map((r) => <p key={r._id} className="text-sm text-ink2">@{r.senderId?.username} · {r.quantity} gift(s) · {r.grossPoints} pts</p>)}</>}<p className="text-xs text-muted">Show or hide supporter names in Settings → Creator.</p></div>;
}
function RatingsTab() {
  const { user } = useAuth(); const { toast } = useLive(); const [d, setD] = useState(null); useEffect(() => { api(`/creators/${user.id}/ratings`).then(setD); }, []);
  const report = async (id) => { await api(`/ratings/${id}/report`, { method: 'POST' }); toast('Reported to admins'); };
  if (!d) return <Skeleton className="h-40" />;
  return <div className="space-y-3"><div className="card"><p className="text-3xl font-bold">{d.avg ?? '–'}</p><p className="text-xs text-muted">{d.count} verified reviews</p></div>{d.items.length === 0 ? <Empty>No reviews yet.</Empty> : d.items.map((r) => <div key={r._id} className="card !p-3 text-sm space-y-1"><div className="flex justify-between"><b>{r.reviewerId?.username}</b><span className="text-warn">{'★'.repeat(r.stars)}</span></div><p className="text-ink2">{r.text}</p><button className="text-xs text-bad" onClick={() => report(r._id)}>Report abusive review</button></div>)}</div>;
}
function RequestsTab() {
  const { toast } = useLive(); const qc = useQueryClient(); const me = useQuery({ queryKey: ['me'], queryFn: get('/me'), staleTime: 0 }); const rs = me.data?.me.requestSettings;
  const [f, setF] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const v = f || { enabled: rs?.enabled !== false, minPricePoints: rs?.minPricePoints || 1, instructions: rs?.instructions || '', turnaroundDays: rs?.turnaroundDays || 7 };
  const save = async () => { setBusy(true); setErr(''); try { await api('/creators/request-settings', { method: 'PATCH', body: { ...v, minPricePoints: Number(v.minPricePoints), turnaroundDays: Number(v.turnaroundDays) } }); toast('Request settings saved'); qc.invalidateQueries({ queryKey: ['me'] }); qc.invalidateQueries({ queryKey: ['profile'] }); setF(null); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <div className="space-y-4"><Section q={me} height="h-48">{() => <div className="card space-y-3"><h3 className="font-semibold">Special request settings</h3><p className="text-xs text-muted">Set your own price and rules. Only creators can do this.</p>
    <label className="flex items-center justify-between text-sm">Accept special requests<button role="switch" aria-checked={v.enabled} onClick={() => setF({ ...v, enabled: !v.enabled })} className={`relative w-11 h-6 rounded-full transition ${v.enabled ? 'bg-violet' : 'bg-card2 border border-line'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${v.enabled ? 'translate-x-5' : ''}`} /></button></label>
    <label className="block text-sm">Minimum price (points)<input type="number" min={1} className="input mt-1" value={v.minPricePoints} onChange={(e) => setF({ ...v, minPricePoints: e.target.value })} /></label>
    <label className="block text-sm">Typical turnaround (days)<input type="number" min={1} max={90} className="input mt-1" value={v.turnaroundDays} onChange={(e) => setF({ ...v, turnaroundDays: e.target.value })} /></label>
    <label className="block text-sm">What you offer / rules<textarea className="input mt-1" maxLength={600} value={v.instructions} onChange={(e) => setF({ ...v, instructions: e.target.value })} placeholder="e.g. Personalised shout-outs, no explicit content" /></label><Err>{err}</Err>
    <button className="btn-primary w-full" disabled={busy || !f} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button></div>}</Section>
    <h3 className="font-semibold">Requests</h3><Requests /></div>;
}
function ProAnalytics() {
  const q = useQuery({ queryKey: ['insights', 'advanced'], queryFn: get('/insights/advanced'), retry: false, staleTime: 60_000 }); const pro = useQuery({ queryKey: ['pro'], queryFn: get('/pro'), staleTime: 5 * 60_000, enabled: q.error?.code === 'PRO_REQUIRED' });
  if (q.isPending) return <Skeleton className="h-64" />;
  if (q.error?.code === 'PRO_REQUIRED') return <div className="card space-y-3 text-center"><div className="text-4xl">👑</div><h3 className="font-semibold text-lg">Advanced analytics are a Pro feature</h3><ul className="text-sm text-ink2 text-left space-y-1">{(pro.data?.benefits || []).filter((b) => b.startsWith('Advanced')).map((b) => <li key={b}>✓ {b.replace('Advanced analytics: ', '')}</li>)}</ul><Link to="/settings" className="btn-primary w-full">See Pro plan</Link></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data; const COL = ['#8B5CF6', '#EC4899', '#60A5FA', '#22C55E', '#F59E0B', '#A78BFA'];
  const Row = ({ u, right }) => <div className="flex items-center gap-3 text-sm py-1.5"><Avatar user={u} size={32} /><span className="flex-1 truncate">{u?.displayName || u?.username || 'Unknown'}</span><b>{right}</b></div>;
  return <div className="space-y-4">
    <div className="card"><h3 className="font-semibold mb-1">Top supporters</h3><p className="text-xs text-muted mb-2">By points spent on you</p>{d.topSupporters.length === 0 ? <p className="text-sm text-muted">No supporter activity yet.</p> : d.topSupporters.map((s, i) => <Row key={i} u={s.user} right={`${s.points} pts`} />)}</div>
    <div className="card"><h3 className="font-semibold mb-1">Most active supporters</h3><p className="text-xs text-muted mb-2">Likes and comments on your posts</p>{d.mostActiveSupporters.length === 0 ? <p className="text-sm text-muted">No interactions yet.</p> : d.mostActiveSupporters.map((s, i) => <Row key={i} u={s.user} right={`${s.interactions}`} />)}</div>
    <div className="card"><h3 className="font-semibold mb-2">Most popular content</h3>{d.popularContent.length === 0 ? <p className="text-sm text-muted">No posts yet.</p> : d.popularContent.map((p) => <div key={p._id} className="py-1.5 text-sm"><p className="truncate">{p.caption || '(media post)'}</p><p className="text-xs text-muted">{p.views} views · {p.likes} likes · {p.comments} comments</p></div>)}</div>
    <div className="card"><h3 className="font-semibold mb-2">Exclusive content by revenue</h3>{d.exclusiveByRevenue.length === 0 ? <p className="text-sm text-muted">No exclusive sales yet.</p> : d.exclusiveByRevenue.map((p, i) => <div key={p._id} className="flex justify-between py-1.5 text-sm"><span className="truncate pr-3">{i + 1}. {p.caption || '(media post)'}</span><b className="shrink-0">{p.points} pts · {p.buyers} buyers</b></div>)}</div>
    <div className="card"><h3 className="font-semibold mb-3">Revenue by source</h3>{d.revenueBySource.length === 0 ? <p className="text-sm text-muted">No revenue yet.</p> : <Donut parts={d.revenueBySource.map((r, i) => ({ label: r.type.replaceAll('_', ' ').toLowerCase(), value: r.points, color: COL[i % COL.length] }))} />}</div>
    <div className="card"><h3 className="font-semibold mb-2">New followers, last 30 days</h3><LineChart points={d.followerGrowth.filter((_, i) => i % 5 === 0 || i === 29).map((x) => ({ label: x.date.slice(5), value: x.followers }))} /></div></div>;
}
const TABS = [['overview', 'Overview', Overview], ['earnings', 'Earnings', Earnings], ['promotions', 'Promotions', Promotions], ['meetups', 'Innercircle', MeetupSettings], ['posts', 'Posts', Posts], ['audience', 'Audience', Audience], ['gifts', 'Gifts', GiftsTab], ['ratings', 'Ratings', RatingsTab], ['pro', 'Pro analytics', ProAnalytics], ['requests', 'Requests', RequestsTab]];
export default function Studio() {
  const { user } = useAuth(); const [tab, setTab] = useState('overview');
  if (user.accountMode !== 'CREATOR') return <Navigate to={`/u/${user.username}`} />;
  const Body = TABS.find((t) => t[0] === tab)[2];
  return <div className="space-y-4"><h1 className="text-3xl font-bold">Creator Studio</h1>
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`chip ${tab === k ? 'bg-violet border-violet' : 'border-line text-ink2'}`}>{l}</button>)}<Link to="/referrals" className="chip border-line text-ink2">Referrals</Link></div>
    <Body /></div>;
}
