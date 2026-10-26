import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Empty, Err, Skeleton, Modal, Section } from '../components/ui.jsx';
import { get, keys } from '../lib/query.js';
import { useConfirmSpend } from '../components/ConfirmSpend.jsx';
import { api, ago, fmtPoints, uid } from '../lib/api';
import { useAuth } from '../context/Auth.jsx';
import { useLive } from '../context/Live.jsx';

export function Notifications() {
  const { setNotifUnread } = useLive(); const qc = useQueryClient();
  const q = useQuery({ queryKey: keys.notifications, queryFn: get('/notifications'), staleTime: 15_000 });
  useEffect(() => { if (q.data) setNotifUnread(q.data.unread); }, [q.data?.unread]);
  const readAll = async () => { await api('/notifications/read-all', { method: 'POST' }); qc.invalidateQueries({ queryKey: keys.notifications }); setNotifUnread(0); };
  return <div className="space-y-4"><div className="flex justify-between items-center"><h1 className="text-3xl font-bold">Notifications</h1><button className="btn-ghost !py-2" onClick={readAll}>Mark all read</button></div>
    <Section q={q} height="h-32" isEmpty={(d) => d.items.length === 0} empty={<Empty>You're all caught up.</Empty>}>{(d) => <ul className="space-y-2">{d.items.map((n) => <li key={n._id}><Link to={n.link || '#'} onClick={() => !n.read && api(`/notifications/${n._id}/read`, { method: 'POST' }).then(() => qc.invalidateQueries({ queryKey: ['counts'] }))} className={`card !p-3 flex gap-3 items-center ${n.read ? 'opacity-60' : ''}`}>{!n.read && <i className="w-2 h-2 rounded-full bg-pink" />}<span className="flex-1 text-sm">{n.text}</span><span className="text-xs text-muted">{ago(n.createdAt)}</span></Link></li>)}</ul>}</Section></div>;
}

export function Communities() {
  const { toast } = useLive(); const [items, setItems] = useState(null); const [open, setOpen] = useState(false); const [f, setF] = useState({ name: '', description: '', accessFeePoints: 0 }); const [err, setErr] = useState(''); const { user } = useAuth();
  const load = () => api('/communities').then((d) => setItems(d.items)); useEffect(() => { load(); }, []);
  const ask = useConfirmSpend();
  const join = async (c) => { if (c.accessFeePoints > 0 && !(await ask({ title: `Join ${c.name}?`, detail: 'One-time access fee.', points: c.accessFeePoints, confirmLabel: 'Join' }))) return; try { await api(`/communities/${c._id}/join`, { method: 'POST' }); toast(`Joined ${c.name}`); window.dispatchEvent(new Event('wallet:changed')); load(); } catch (e) { toast(e.message); } };
  const create = async () => { try { await api('/communities', { method: 'POST', body: { ...f, accessFeePoints: Number(f.accessFeePoints) } }); setOpen(false); load(); } catch (e) { setErr(e.message); } };
  return <div className="space-y-4"><div className="flex justify-between items-center"><h1 className="text-3xl font-bold">Communities</h1><button className="btn-primary !py-2" onClick={() => setOpen(true)}>Create</button></div>
    {!items ? <Skeleton /> : items.length === 0 ? <Empty>No communities yet.</Empty> : <div className="grid sm:grid-cols-2 gap-3">{items.map((c) => <div key={c._id} className="card space-y-2"><div className="flex items-center gap-2"><Link to={`/communities/${c._id}`} className="font-semibold flex-1">{c.name}</Link>{c.sponsored && <Badge tone="pink">Sponsored</Badge>}{c.accessFeePoints > 0 && <Badge>{c.accessFeePoints} pts</Badge>}</div><p className="text-sm text-ink2">{c.description}</p><div className="flex justify-between items-center text-xs text-muted"><span>{c.memberCount} members · by @{c.ownerId?.username}</span><button disabled={c.joined} onClick={() => join(c)} className="btn-ghost !py-1.5">{c.joined ? 'Joined ✓' : 'Join'}</button></div></div>)}</div>}
    <Modal open={open} onClose={() => setOpen(false)} title="New community"><div className="space-y-3"><input className="input" placeholder="Name" onChange={(e) => setF({ ...f, name: e.target.value })} /><textarea className="input" placeholder="Description" onChange={(e) => setF({ ...f, description: e.target.value })} />
      {user.accountMode === 'CREATOR' && <label className="block text-sm">Access fee (points, 0 = free)<input type="number" min={0} className="input mt-1" value={f.accessFeePoints} onChange={(e) => setF({ ...f, accessFeePoints: e.target.value })} /></label>}<Err>{err}</Err><button className="btn-primary w-full" onClick={create}>Create</button></div></Modal></div>;
}

export function Referrals() {
  const { toast } = useLive(); const [d, setD] = useState(null); useEffect(() => { api('/studio/referrals').then(setD); }, []);
  if (!d) return <Skeleton className="h-60" />;
  const copy = () => { navigator.clipboard?.writeText(d.link); toast('Link copied'); };
  return <div className="space-y-4"><h1 className="text-3xl font-bold">Referrals</h1>
    <div className="card space-y-3"><p className="text-sm text-ink2">Earn {(d.bps / 100).toFixed(1)}% of net sales from creators you refer, for {d.days} days. Rewards are paid in points after a review period, and never on refunded sales.</p>
      <div className="flex gap-2"><input readOnly className="input" value={d.link} aria-label="Referral link" /><button className="btn-primary" onClick={copy}>Copy</button></div><p className="text-xs text-muted">Code: {d.code}</p></div>
    <div className="grid grid-cols-2 gap-3">{[['Referred', d.referred], ['Qualified (creators)', d.qualified], ['Pending rewards', fmtPoints(d.pendingRewards)], ['Approved rewards', fmtPoints(d.approvedRewards)]].map(([l, v]) => <div key={l} className="card"><p className="text-sm text-ink2">{l}</p><p className="text-2xl font-bold">{v}</p></div>)}</div>
    <h2 className="text-xl font-semibold">History</h2>{d.history.length === 0 ? <Empty>No referral rewards yet.</Empty> : d.history.map((h) => <div key={h._id} className="card !p-3 flex justify-between text-sm"><span>+{h.amount} pts</span><span className="text-ink2">{h.status}</span></div>)}</div>;
}

const NEXT = { PENDING: 'Waiting for creator', ACCEPTED: 'Accepted', DELIVERED: 'Delivered — confirm to release payment', COMPLETED: 'Completed', REJECTED: 'Rejected (refunded)', CANCELLED: 'Cancelled (refunded)' };
export function Requests() {
  const { toast } = useLive(); const [as, setAs] = useState('user'); const [items, setItems] = useState(null);
  const load = () => api(`/requests?as=${as}`).then((d) => setItems(d.items)); useEffect(() => { setItems(null); load(); }, [as]);
  const act = async (id, a) => { try { await api(`/requests/${id}/${a}`, { method: 'POST' }); load(); } catch (e) { toast(e.message); } };
  return <div className="space-y-4"><h1 className="text-3xl font-bold">Special requests</h1><div className="flex gap-2">{['user', 'creator'].map((k) => <button key={k} onClick={() => setAs(k)} className={`chip ${as === k ? 'bg-violet border-violet' : 'border-line text-ink2'}`}>{k === 'user' ? 'Sent by me' : 'Received'}</button>)}</div>
    {!items ? <Skeleton /> : items.length === 0 ? <Empty>No requests.</Empty> : items.map((r) => <div key={r._id} className="card space-y-2 text-sm"><div className="flex justify-between"><b>{as === 'user' ? r.creatorId?.username : r.userId?.username}</b><span>{r.offerPoints} pts</span></div><p className="text-ink2">{r.description}</p><p className="text-xs text-violet-light">{NEXT[r.status]}</p>
      <div className="flex gap-2 flex-wrap">{as === 'creator' && r.status === 'PENDING' && <><button className="btn-primary !py-2" onClick={() => act(r._id, 'accept')}>Accept</button><button className="btn-ghost !py-2" onClick={() => act(r._id, 'reject')}>Reject</button></>}
        {as === 'creator' && r.status === 'ACCEPTED' && <button className="btn-primary !py-2" onClick={() => act(r._id, 'deliver')}>Mark delivered</button>}
        {as === 'user' && r.status === 'DELIVERED' && <button className="btn-primary !py-2" onClick={() => act(r._id, 'complete')}>Confirm delivery</button>}
        {as === 'user' && r.status === 'PENDING' && <button className="btn-ghost !py-2" onClick={() => act(r._id, 'cancel')}>Cancel</button>}</div></div>)}</div>;
}

const STEPS = ['PAID_AND_RESERVED', 'CREATOR_ACCEPTED', 'MEETUP_PENDING_USER_ACCEPTANCE', 'USER_ACCEPTED', 'COMPLETED', 'EARNINGS_RELEASED'];
export function Meetups({ asCreator = false }) {
  const { toast } = useLive(); const [as, setAs] = useState(asCreator ? 'creator' : 'user'); const [items, setItems] = useState(null);
  const load = () => api(`/meetups/me?as=${as}`).then((d) => setItems(d.items)); useEffect(() => { setItems(null); load(); }, [as]);
  const act = async (id, a) => { try { await api(`/meetups/${id}/${a}`, { method: 'POST' }); load(); } catch (e) { toast(e.message); } };
  const btn = (id, a, label, primary) => <button key={a} className={primary ? 'btn-primary !py-2' : 'btn-ghost !py-2'} onClick={() => act(id, a)}>{label}</button>;
  return <div className="space-y-4">{!asCreator && <h1 className="text-3xl font-bold">Innercircle</h1>}
    {!asCreator && <div className="flex gap-2">{['user', 'creator'].map((k) => <button key={k} onClick={() => setAs(k)} className={`chip ${as === k ? 'bg-violet border-violet' : 'border-line text-ink2'}`}>{k === 'user' ? 'My bookings' : 'Received'}</button>)}</div>}
    {!items ? <Skeleton /> : items.length === 0 ? <Empty>No bookings.</Empty> : items.map((b) => { const idx = STEPS.indexOf(b.status); const cr = as === 'creator'; return <div key={b._id} className="card space-y-3 text-sm">
      <div className="flex justify-between"><b>{cr ? b.userId?.username : b.creatorId?.username}</b><span>{new Date(b.slotAt).toLocaleString()}</span></div>
      <p className="text-ink2">Fee {b.feePoints} pts · Transport {b.transportPoints} pts · {b.area}</p>
      <div className="flex gap-1" aria-label="Progress">{STEPS.map((s, i) => <i key={s} className={`h-1.5 flex-1 rounded-full ${idx >= i ? 'bg-violet' : 'bg-card2'}`} />)}</div>
      <p className="text-xs text-violet-light">{b.status.replaceAll('_', ' ')}</p>
      <div className="flex gap-2 flex-wrap">
        {cr && b.status === 'PAID_AND_RESERVED' && [btn(b._id, 'accept', 'Accept', true), btn(b._id, 'reject', 'Reject')]}
        {cr && b.status === 'CREATOR_ACCEPTED' && btn(b._id, 'confirm', 'Confirm details', true)}
        {cr && b.status === 'USER_ACCEPTED' && btn(b._id, 'complete', 'Mark completed', true)}
        {!cr && b.status === 'MEETUP_PENDING_USER_ACCEPTANCE' && btn(b._id, 'user-accept', 'Accept booking', true)}
        {!cr && ['PAID_AND_RESERVED', 'CREATOR_ACCEPTED', 'MEETUP_PENDING_USER_ACCEPTANCE'].includes(b.status) && btn(b._id, 'cancel', 'Cancel')}
        {!cr && ['USER_ACCEPTED', 'COMPLETED'].includes(b.status) && btn(b._id, 'dispute', 'Report a problem')}</div></div>; })}</div>;
}

export function Subscriptions() {
  const [items, setItems] = useState(null); useEffect(() => { api('/subscriptions/me').then((d) => setItems(d.items)); }, []);
  return <div className="space-y-4"><h1 className="text-3xl font-bold">Subscriptions</h1>{!items ? <Skeleton /> : items.length === 0 ? <Empty>No subscriptions yet.</Empty> : items.map((s) => <Link key={s._id} to={`/u/${s.creatorId.username}`} className="card !p-3 flex items-center gap-3"><Avatar user={s.creatorId} /><span className="flex-1"><b>{s.creatorId.displayName || s.creatorId.username}</b><span className="block text-xs text-muted">{s.status === 'ACTIVE' ? `Renews/expires ${new Date(s.expiresAt).toLocaleDateString()}` : 'Expired'}</span></span><Badge tone={s.status === 'ACTIVE' ? 'ok' : 'violet'}>{s.status}</Badge></Link>)}</div>;
}
