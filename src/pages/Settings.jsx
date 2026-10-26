import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X as XIcon, Crown } from 'lucide-react';
import { Avatar, Err, Section, Badge } from '../components/ui.jsx';
import EditProfileModal from '../components/EditProfileModal.jsx';
import { api, fmtPoints } from '../lib/api';
import { get } from '../lib/query.js';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';
import { useConfirmSpend } from '../components/ConfirmSpend.jsx';

const Sec = ({ title, children }) => <section className="card space-y-3 animate-rise"><h2 className="text-lg font-semibold">{title}</h2>{children}</section>;
const Sw = ({ on, onChange, label }) => <label className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative w-11 h-6 rounded-full shrink-0 transition ${on ? 'bg-violet' : 'bg-card2 border border-line'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} /></button></label>;
const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const Yes = ({ v }) => (v ? <Check size={16} className="text-ok mx-auto" aria-label="Included" /> : <XIcon size={16} className="text-muted mx-auto" aria-label="Not included" />);

function ProPlan({ me, creator, onChanged }) {
  const ask = useConfirmSpend(); const { toast } = useLive(); const q = useQuery({ queryKey: ['pro'], queryFn: get('/pro'), staleTime: 5 * 60_000 }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const upgrade = async () => { if (!(await ask({ title: me.creatorPlan === 'PRO' ? 'Extend your Pro plan?' : 'Upgrade to Pro?', detail: `Pro lasts ${q.data.days} days from today (extends if already active).`, points: q.data.pricePoints, confirmLabel: me.creatorPlan === 'PRO' ? 'Extend' : 'Upgrade' }))) return; setBusy(true); setErr('');
    try { await api('/pro/upgrade', { method: 'POST' }); toast('Pro plan active 🎉'); window.dispatchEvent(new Event('wallet:changed')); onChanged(); } catch (e) { setErr(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points' : e.message); } finally { setBusy(false); } };
  return <Sec title="Pro plan"><Section q={q} height="h-40">{(d) => <>
    <p className="text-sm text-ink2 flex items-center gap-2"><Crown size={16} className="text-warn" />{fmtPoints(d.pricePoints)} for {d.days} days. {creator ? `You are on ${me.creatorPlan}${me.proExpiresAt ? ` until ${new Date(me.proExpiresAt).toLocaleDateString()}` : ''}.` : 'Pro is for creators.'}</p>
    <ul className="space-y-1.5 text-sm">{d.benefits.map((b) => <li key={b} className="flex gap-2"><Check size={16} className="text-ok shrink-0 mt-0.5" /><span>{b}</span></li>)}</ul>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-muted text-left"><tr><th className="py-2 font-medium">Feature</th><th className="text-center font-medium">Default</th><th className="text-center font-medium text-violet-light">Pro</th></tr></thead><tbody className="divide-y divide-divider">
      {[['Exclusive posts per month', d.limits.DEFAULT.exclusivePostsPerMonth, d.limits.PRO.exclusivePostsPerMonth], ['Platform commission', `${d.limits.DEFAULT.commissionBps / 100}%`, `${d.limits.PRO.commissionBps / 100}%`], ['Max video length', `${d.limits.DEFAULT.videoSec}s`, `${d.limits.PRO.videoSec}s`], ['Pinned posts', d.limits.DEFAULT.pinnedPosts, d.limits.PRO.pinnedPosts]].map(([f, a, b]) => <tr key={f}><td className="py-2">{f}</td><td className="text-center">{a}</td><td className="text-center font-semibold">{b}</td></tr>)}
      {[['Advanced analytics', 'advancedAnalytics']].map(([f, k]) => <tr key={f}><td className="py-2">{f}</td><td><Yes v={d.limits.DEFAULT[k]} /></td><td><Yes v={d.limits.PRO[k]} /></td></tr>)}</tbody></table></div>
    {d.note && <p className="text-xs text-muted">{d.note}</p>}<Err>{err}</Err>{creator ? <button className="btn-primary w-full" disabled={busy} onClick={upgrade}>{busy ? 'Working…' : `${me.creatorPlan === 'PRO' ? 'Extend' : 'Upgrade'} · ${fmtPoints(d.pricePoints)}`}</button> : <Link to="/become-creator" className="btn-ghost w-full">Become a creator to use Pro</Link>}</>}</Section></Sec>;
}

const SERVICES = [['paidPhotos', 'Paid photos', false, 'Sell individual photos in your posts'], ['paidVideos', 'Paid videos', false, 'Sell individual videos in your posts'], ['promotions', 'Creator promotions', false, 'Boost your posts and profile'], ['specialRequests', 'Special requests', 'Minimum price (points)', 'Fans pay you for custom requests'], ['paidCommunities', 'Paid communities', false, 'Charge an entry fee for communities you own'], ['paidVoice', 'Paid voice messages', 'Default price (points)', 'Sell voice notes in chat'], ['tipsGifts', 'Tips and gifts', false, 'Let fans send you gifts'], ['subscriptions', 'Monthly subscriptions', 'Monthly price (points)', 'Subscriber-only content'], ['innerCircle', 'Innercircle', 'Booking price (points)', 'Paid in-person bookings. Needs identity verification in Creator Studio before it goes live']];
// Every service can be switched on or off at any time, and every price is yours to set (no caps on any plan).
function CreatorServices() {
  const { toast } = useLive(); const qc = useQueryClient(); const q = useQuery({ queryKey: ['creator-services'], queryFn: get('/creators/services'), staleTime: 0 }); const [f, setF] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  return <Sec title="Creator services"><Section q={q} height="h-48">{(d) => { const cur = f || Object.fromEntries(SERVICES.map(([k]) => [k, { enabled: d.services[k]?.enabled ?? (k === 'subscriptions' ? d.subscriptionPricePoints > 0 : k === 'specialRequests' ? d.requestSettings?.enabled !== false : true), 
pricePoints: d.services[k]?.pricePoints ?? ((k === 'subscriptions' ? d.subscriptionPricePoints : k === 'specialRequests' ? d.requestSettings?.minPricePoints : k === 'innerCircle' ? d.meetup.pricePoints : '') || '')
 }]));
    const set = (k, v) => setF({ ...cur, [k]: { ...cur[k], ...v } });
    const save = async () => { setBusy(true); setErr(''); try { const services = Object.fromEntries(SERVICES.map(([k]) => [k, { enabled: !!cur[k].enabled, ...(Number(cur[k].pricePoints) > 0 ? { pricePoints: Number(cur[k].pricePoints) } : {}) }])); await api('/creators/services', { method: 'PATCH', body: { services } }); toast('Services saved'); setF(null); qc.invalidateQueries({ queryKey: ['creator-services'] }); qc.invalidateQueries({ queryKey: ['me'] }); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
    return <div className="space-y-3"><p className="text-xs text-muted">You set your own prices for everything. Switch on only what you want; you can change this any time.</p>
      {SERVICES.map(([k, label, priceLabel, hint]) => <div key={k} className="rounded-btn bg-card2 p-3 space-y-2"><Sw label={<span><b className="block">{label}</b><span className="text-xs text-ink2">{hint}</span></span>} on={!!cur[k].enabled} onChange={(v) => set(k, { enabled: v })} />
        {priceLabel && cur[k].enabled && <label className="block text-sm animate-rise">{priceLabel}<input type="number" min={1} className="input mt-1" value={cur[k].pricePoints} onChange={(e) => set(k, { pricePoints: e.target.value })} /></label>}</div>)}
      <Err>{err}</Err>{f && <button className="btn-primary w-full" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save services'}</button>}</div>; }}</Section></Sec>;
}

export default function Settings() {
  const { user, refresh, logout } = useAuth(); const { toast } = useLive(); const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ['me'], queryFn: get('/me'), staleTime: 0 }); const blocksQ = useQuery({ queryKey: ['blocks'], queryFn: get('/blocks'), staleTime: 30_000 }); const me = meQ.data?.me;
  const [pw, setPw] = useState({}); const [err, setErr] = useState(''); const [code, setCode] = useState(''); const [editing, setEditing] = useState(false); const [dm, setDm] = useState(null);
  const creator = user.accountMode === 'CREATOR';
  const reload = () => { qc.invalidateQueries({ queryKey: ['me'] }); refresh(); };
  if (!me) return <Section q={meQ} height="h-64">{() => null}</Section>;
  const patch = async (body) => { try { await api('/me', { method: 'PATCH', body }); reload(); toast('Saved'); } catch (e) { setErr(e.message); } };
  const creatorPatch = async (body) => { try { await api('/creators/settings', { method: 'PATCH', body }); toast('Saved'); reload(); } catch (e) { setErr(e.message); } };
  const setPrefs = (k) => (v) => patch({ prefs: { [k]: v } });
  const push = async (on) => {
    try {
      if (!on) { await api('/push/unsubscribe', { method: 'POST' }); return reload(); }
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push is not supported in this browser');
      const { key } = await api('/push/key'); if (!key) throw new Error('Push is not configured on the server yet');
      if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notification permission was denied');
      const reg = await navigator.serviceWorker.register('/sw.js'); const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
      await api('/push/subscribe', { method: 'POST', body: sub.toJSON() }); toast('Push notifications on'); reload();
    } catch (e) { setErr(e.message); }
  };
  const changePw = async (e) => { e.preventDefault(); try { await api('/me/password', { method: 'PUT', body: { current: pw.current, next: pw.next } }); toast('Password changed'); setPw({}); } catch (x) { setErr(x.message); } };
  const claim = async () => { try { await api('/referrals/claim', { method: 'POST', body: { code } }); toast('Referral applied'); reload(); } catch (e) { setErr(e.message); } };
  const saveDm = async () => { try { await api('/me/dm', { method: 'PATCH', body: { mode: dm.mode, pricePoints: dm.mode === 'PAID' ? Number(dm.pricePoints) : undefined } }); toast('Messaging access saved'); reload(); setDm(null); } catch (e) { setErr(e.message); } };
  const dmv = dm || { mode: me.dmPolicy?.mode || 'OPEN', pricePoints: me.dmPolicy?.pricePoints || 1 };
  return <div className="space-y-4"><h1 className="text-3xl font-bold">Settings</h1><Err>{err}</Err>
    <Sec title="Profile"><div className="flex items-center gap-3"><Avatar user={me} size={56} /><div className="min-w-0 flex-1"><p className="font-semibold truncate">{me.displayName || me.username}</p><p className="text-xs text-muted truncate">@{me.username} · {me.email}</p></div><button className="btn-primary !py-2" onClick={() => setEditing(true)}>Edit profile</button></div></Sec>
    <Sec title="Privacy"><label className="block text-sm">Who can message you directly<select className="input mt-1" value={me.prefs.messages} onChange={(e) => patch({ prefs: { messages: e.target.value } })}><option value="EVERYONE">Everyone</option><option value="REQUESTS">New people go to Requests first</option></select></label>
      <Sw label="Show when I'm online" on={me.prefs.showOnline} onChange={setPrefs('showOnline')} />
      <div><p className="text-sm mb-2">Blocked accounts</p>{!blocksQ.data?.items.length ? <p className="text-xs text-muted">No blocked accounts.</p> : blocksQ.data.items.map((b) => <div key={b._id} className="flex items-center gap-3 py-1 text-sm"><Avatar user={b.blockedId} size={28} /><span className="flex-1">@{b.blockedId?.username}</span><button className="text-violet-light" onClick={async () => { await api(`/block/${b.blockedId._id}`, { method: 'DELETE' }); qc.invalidateQueries({ queryKey: ['blocks'] }); }}>Unblock</button></div>)}</div></Sec>
    <Sec title="Notifications"><Sw label="Push notifications on this device" on={me.prefs.push} onChange={push} /><Sw label="Email notifications (payments, payouts, bookings)" on={me.prefs.emailNotifs} onChange={setPrefs('emailNotifs')} /><Sw label="Promotional and referral updates" on={me.prefs.promoNotifs} onChange={setPrefs('promoNotifs')} /></Sec>
    {creator && <Sec title="Creator"><label className="block text-sm">Monthly subscription price (points, 0 = off). Choose any price<input type="number" min={0} className="input mt-1" defaultValue={me.subscriptionPricePoints} onBlur={(e) => Number(e.target.value) !== me.subscriptionPricePoints && creatorPatch({ subscriptionPricePoints: Number(e.target.value) })} /></label>
      <Sw label="Show who sent me gifts on my profile" on={me.showGiftSenders} onChange={(v) => creatorPatch({ showGiftSenders: v })} />
      <div className="space-y-2"><label className="block text-sm">Who can message you<select className="input mt-1" value={dmv.mode} onChange={(e) => setDm({ ...dmv, mode: e.target.value })}><option value="OPEN">Everyone (free)</option><option value="PAID">Anyone who pays a fee (subscribers free)</option><option value="SUBSCRIBERS">Subscribers only</option></select></label>
        {dmv.mode === 'PAID' && <label className="block text-sm animate-rise">Fee to start a conversation (points)<input type="number" min={1} className="input mt-1" value={dmv.pricePoints} onChange={(e) => setDm({ ...dmv, pricePoints: e.target.value })} /></label>}
        {dm && <button className="btn-primary" onClick={saveDm}>Save messaging access</button>}<p className="text-xs text-muted">People you message first can always reply. Special request prices are set in Creator Studio → Requests.</p></div></Sec>}
    {creator && <CreatorServices />}
    <ProPlan me={me} creator={creator} onChanged={reload} />
    {!me.referredBy && <Sec title="Have a referral code?"><div className="flex gap-2"><input className="input" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn-ghost" onClick={claim}>Apply</button></div><p className="text-xs text-muted">Only possible in your first 7 days.</p></Sec>}
    <Sec title="Security"><form onSubmit={changePw} className="space-y-3"><input type="password" className="input" placeholder="Current password" value={pw.current || ''} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /><input type="password" minLength={8} className="input" placeholder="New password (8+ characters)" value={pw.next || ''} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /><button className="btn-primary">Change password</button></form></Sec>
    <div className="flex gap-2"><Link to="/wallet" className="btn-ghost flex-1">Wallet</Link><button className="btn-ghost flex-1 text-bad" onClick={logout}>Log out</button></div>
    <EditProfileModal open={editing} onClose={() => { setEditing(false); reload(); }} /></div>;
}
