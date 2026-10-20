import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Heart, MessageCircle, Pin, Megaphone } from 'lucide-react';
import { Section, Empty, Err, Modal, Badge } from '../components/ui.jsx';
import { api, fmtPoints, uid, ago } from '../lib/api';
import { get } from '../lib/query.js';
import { useConfirmSpend } from '../components/ConfirmSpend.jsx';
import { useLive } from '../context/Live.jsx';
import { useAuth } from '../context/Auth.jsx';

const LABEL = { DAY1: '24 hours', DAY3: '3 days', DAY7: '7 days' };
export function PromoteModal({ post, onClose }) {
  const ask = useConfirmSpend(); const { toast } = useLive(); const qc = useQueryClient(); const prices = useQuery({ queryKey: ['promo-prices'], queryFn: get('/promotions/prices'), staleTime: 5 * 60_000 }); const [d, setD] = useState('DAY1'); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [key] = useState(uid());
  const go = async () => { const price = prices.data[d]; if (!(await ask({ title: 'Promote this post?', detail: `Show it as Sponsored for ${LABEL[d]}. Results are not guaranteed.`, points: price, confirmLabel: 'Promote' }))) return; setBusy(true); setErr('');
    try { await api('/promotions', { method: 'POST', body: { targetType: 'POST', targetId: post._id, duration: d, idempotencyKey: key } }); toast('Promotion started'); window.dispatchEvent(new Event('wallet:changed')); qc.invalidateQueries({ queryKey: ['insights'] }); qc.invalidateQueries({ queryKey: ['promotions'] }); onClose(); } catch (e) { setErr(e.code === 'INSUFFICIENT_POINTS' ? 'Not enough points. Top up in your wallet.' : e.message); } finally { setBusy(false); } };
  return <Modal open onClose={onClose} title="Promote post"><div className="space-y-3"><p className="text-sm text-ink2 line-clamp-2">{post.content || 'Your post'}</p>
    <div className="grid grid-cols-3 gap-2">{Object.keys(LABEL).map((k) => <button key={k} onClick={() => setD(k)} className={`card !p-3 text-center ${d === k ? '!border-violet' : ''}`}><p className="text-sm">{LABEL[k]}</p><p className="font-bold">{prices.data ? `${prices.data[k]} pts` : '…'}</p></button>)}</div><Err>{err}</Err>
    <button className="btn-primary w-full" disabled={busy || !prices.data} onClick={go}>{busy ? 'Starting…' : 'Continue'}</button></div></Modal>;
}

// Post analytics for EVERY account, plus promotions.
export default function Insights() {
  const { user } = useAuth(); const [promo, setPromo] = useState(null); const creator = user.accountMode === 'CREATOR';
  const q = useQuery({ queryKey: ['insights', 'posts'], queryFn: get('/insights/posts'), staleTime: 30_000 }); const promos = useQuery({ queryKey: ['promotions', 'me'], queryFn: get('/promotions/me'), staleTime: 30_000 });
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Insights</h1>
    <Section q={q} height="h-28">{(d) => <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[['Posts', d.totals.posts, null], ['Views', d.totals.views, Eye], ['Likes', d.totals.likes, Heart], ['Comments', d.totals.comments, MessageCircle]].map(([l, v, I]) => <div key={l} className="card !p-4 animate-rise"><p className="text-xs text-ink2 flex items-center gap-1">{I && <I size={13} />}{l}</p><p className="text-2xl font-bold">{v.toLocaleString()}</p></div>)}</div>}</Section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Your posts</h2>
      <Section q={q} height="h-40" isEmpty={(d) => d.items.length === 0} empty={<Empty>No published posts yet. <Link to="/create" className="text-violet-light">Create one</Link>.</Empty>}>{(d) => <ul className="space-y-2">{d.items.map((p) => <li key={p._id} className="card !p-3 space-y-2 animate-rise"><div className="flex items-start gap-2"><p className="text-sm line-clamp-2 flex-1">{p.content || '(media post)'}</p>{p.pinnedAt && <Pin size={14} className="text-violet-light" />}{p.access !== 'PUBLIC' && <Badge>{p.access}</Badge>}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink2"><span className="flex items-center gap-1"><Eye size={13} />{p.views}</span><span className="flex items-center gap-1"><Heart size={13} />{p.likes}</span><span className="flex items-center gap-1"><MessageCircle size={13} />{p.comments}</span>{creator && p.access === 'EXCLUSIVE' && <span>{p.unlocks} unlocks · {fmtPoints(p.revenuePoints)}</span>}<span className="text-muted">{ago(p.createdAt)}</span></div>
        {p.promotion ? <p className="text-xs text-pink">Sponsored · {p.promotion.impressions} impressions · {p.promotion.clicks} clicks{p.promotion.active ? ' · running' : ''}</p> : null}
        {p.access === 'PUBLIC' && <button className="btn-ghost !py-1.5 text-sm" onClick={() => setPromo(p)}><Megaphone size={14} />Promote</button>}</li>)}</ul>}</Section></section>
    <section className="space-y-2"><h2 className="text-xl font-semibold">Promotions</h2><Section q={promos} height="h-20" isEmpty={(d) => d.items.length === 0} empty={<Empty>You have not run any promotions yet.</Empty>}>{(d) => d.items.map((p) => <div key={p._id} className="card !p-3 flex justify-between text-sm"><span><b>{p.targetType}</b> · {LABEL[p.duration]}<br /><span className="text-xs text-muted">{p.impressions} impressions · {p.clicks} clicks · ends {new Date(p.expiresAt).toLocaleDateString()}</span></span><Badge tone={p.status === 'ACTIVE' ? 'ok' : 'violet'}>{p.status}</Badge></div>)}</Section></section>
    {promo && <PromoteModal post={promo} onClose={() => setPromo(null)} />}</div>;
}
